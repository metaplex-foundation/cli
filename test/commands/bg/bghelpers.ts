import { expect } from "chai"
import { runCli } from "../../runCli"
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
    symbol?: string
}): Promise<{ assetId: string | null; signature: string; owner: string }> => {
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

    if (!signature) {
        console.log('NFT creation output:', combined)
        throw new Error('Signature not found in output')
    }

    expect(combined).to.contain('Compressed NFT created')
    expect(signature).to.match(/^[a-zA-Z0-9]{32,}$/)

    // Note: assetId might be null if we can't derive it without DAS
    // This is acceptable for testing as we're primarily verifying the transaction

    return { assetId, signature, owner }
}

export {
    createBubblegumTree,
    createCompressedNFT,
    extractTreeAddress,
    extractAssetId,
    extractSignature,
    stripAnsi,
}
