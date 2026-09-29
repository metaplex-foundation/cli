import { expect } from "chai"
import { getMintV2InstructionDataSerializer, mplBubblegum, MPL_BUBBLEGUM_PROGRAM_ID } from '@metaplex-foundation/mpl-bubblegum'
import type { TransactionSignature } from '@metaplex-foundation/umi'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { base58 } from '@metaplex-foundation/umi/serializers'
import { runCli, TEST_RPC } from "../../runCli"
import { stripAnsi } from "./common"

// Helper to extract tree address from message
const extractTreeAddress = (str: string) => {
    const patterns = [
        /Tree Address: ([a-zA-Z0-9]+)/,
        /Merkle tree created.*?([a-zA-Z0-9]{32,44})/s,
    ]

    for (const pattern of patterns) {
        const match = str.match(pattern)
        if (match) return match[1]
    }
    return null
}

// Helper to extract asset ID from message
const extractAssetId = (str: string) => {
    const patterns = [
        /Asset ID: ([a-zA-Z0-9]+)/,
        /Compressed NFT Created.*?Asset ID: ([a-zA-Z0-9]+)/s,
    ]

    for (const pattern of patterns) {
        const match = str.match(pattern)
        if (match) return match[1]
    }
    return null
}

// Helper to extract signature from message
const extractSignature = (str: string) => {
    const patterns = [
        /Signature: ([a-zA-Z0-9]+)/,
        /Transaction: ([a-zA-Z0-9]+)/,
    ]

    for (const pattern of patterns) {
        const match = str.match(pattern)
        if (match) return match[1]
    }
    return null
}

/**
 * Create a Bubblegum tree for testing
 */
const createBubblegumTree = async (options?: {
    maxDepth?: number
    maxBufferSize?: number
    canopyDepth?: number
    public?: boolean
    name?: string
}): Promise<{ treeAddress: string; signature: string }> => {
    const cliInput = [
        'bg',
        'tree',
        'create',
        '--maxDepth',
        String(options?.maxDepth ?? 14),
        '--maxBufferSize',
        String(options?.maxBufferSize ?? 64),
        '--canopyDepth',
        String(options?.canopyDepth ?? 8),
    ]

    if (options?.public) {
        cliInput.push('--public')
    }

    if (options?.name) {
        cliInput.push('--name', options.name)
    }

    const { stdout, stderr, code } = await runCli(cliInput)

    const cleanStderr = stripAnsi(stderr)
    const cleanStdout = stripAnsi(stdout)
    const combined = cleanStdout + '\n' + cleanStderr

    const treeAddress = extractTreeAddress(combined)
    const signature = extractSignature(combined)

    if (!treeAddress) {
        console.log('Tree creation output:', combined)
        throw new Error('Tree address not found in output')
    }

    if (!signature) {
        console.log('Tree creation output:', combined)
        throw new Error('Signature not found in output')
    }

    expect(code).to.equal(0)
    expect(combined).to.contain('Merkle tree created')
    expect(treeAddress).to.match(/^[a-zA-Z0-9]{32,44}$/)
    expect(signature).to.match(/^[a-zA-Z0-9]{32,}$/)

    return { treeAddress, signature }
}

/**
 * Create a compressed NFT for testing (using --name and --uri to avoid file uploads)
 */
const createCompressedNFT = async (options: {
    tree: string
    name: string
    uri: string
    collection?: string
    royalties?: number
    inheritRoyalties?: boolean
    creators?: string[]
    symbol?: string
}): Promise<{ assetId: string | null; signature: string; owner: string; royaltyMode: string | null }> => {
    const cliInput = [
        'bg',
        'nft',
        'create',
        options.tree,
        '--name',
        options.name,
        '--uri',
        options.uri,
    ]

    if (options.collection) {
        cliInput.push('--collection', options.collection)
    }

    if (options.royalties !== undefined) {
        cliInput.push('--royalties', String(options.royalties))
    }

    if (options.inheritRoyalties) {
        cliInput.push('--inherit-royalties')
    }

    for (const creator of options.creators ?? []) {
        cliInput.push('--creator', creator)
    }

    if (options.symbol) {
        cliInput.push('--symbol', options.symbol)
    }

    const { stdout, stderr, code } = await runCli(cliInput)

    const cleanStderr = stripAnsi(stderr)
    const cleanStdout = stripAnsi(stdout)
    const combined = cleanStdout + '\n' + cleanStderr

    const assetId = extractAssetId(combined)
    const signature = extractSignature(combined)

    // Extract owner (should be the test keypair address)
    const ownerMatch = combined.match(/Owner: ([a-zA-Z0-9]+)/)
    const owner = ownerMatch ? ownerMatch[1] : ''

    const royaltyMatch = combined.match(/Royalties: (.+)/)
    const royaltyMode = royaltyMatch ? royaltyMatch[1].trim() : null

    if (!signature) {
        console.log('NFT creation output:', combined)
        throw new Error('Signature not found in output')
    }

    expect(combined).to.contain('Compressed NFT created')
    expect(signature).to.match(/^[a-zA-Z0-9]{32,}$/)

    // Note: assetId might be null if we can't derive it without DAS
    // This is acceptable for testing as we're primarily verifying the transaction

    return { assetId, signature, owner, royaltyMode }
}

/**
 * Read minted Bubblegum V2 metadata from the mintV2 instruction.
 * Prefer this over `bg nft fetch` in local tests — DAS is not available on the validator.
 * (The emitted leaf schema only stores hashes, not sellerFeeBasisPoints/creators.)
 */
const fetchMintedLeaf = async (signature: string) => {
    const umi = createUmi(TEST_RPC, { commitment: 'confirmed' }).use(mplBubblegum())
    // CLI prints a base58 string; Umi signatures are the decoded bytes.
    const sigBytes = base58.serialize(signature) as TransactionSignature
    if (sigBytes.length !== 64) {
        throw new Error(`Expected a 64-byte transaction signature, got ${sigBytes.length} bytes from "${signature}"`)
    }

    let lastError: unknown
    for (let attempt = 0; attempt < 10; attempt++) {
        try {
            const transaction = await umi.rpc.getTransaction(sigBytes)
            if (!transaction) {
                throw new Error('Could not get transaction from signature')
            }

            const bubblegumProgramId = umi.programs.getPublicKey('mplBubblegum', MPL_BUBBLEGUM_PROGRAM_ID)
            const instruction = transaction.message.instructions.find(
                (ix) => transaction.message.accounts[ix.programIndex] === bubblegumProgramId
            )
            if (!instruction) {
                throw new Error('Could not find mplBubblegum instruction')
            }

            const [data] = getMintV2InstructionDataSerializer().deserialize(instruction.data)
            return { metadata: data.metadata }
        } catch (error) {
            lastError = error
            await new Promise((resolve) => setTimeout(resolve, 400))
        }
    }

    throw lastError
}

export {
    createBubblegumTree,
    createCompressedNFT,
    extractTreeAddress,
    extractAssetId,
    extractSignature,
    fetchMintedLeaf,
    stripAnsi,
}
