import { expect } from 'chai'
import { runCli } from '../../runCli'

// Helper to strip ANSI color codes
export const stripAnsi = (str: string) => str.replace(/\u001b\[\d+m/g, '')

// Helper to extract mint address from NFT creation output
const extractMintAddress = (str: string) => {
    // Try different patterns that might contain the mint address
    const patterns = [
        /NFT: ([a-zA-Z0-9]+)/,
        /Mint: ([a-zA-Z0-9]+)/,
        /Mint Address: ([a-zA-Z0-9]+)/,
    ]

    for (const pattern of patterns) {
        const match = str.match(pattern)
        if (match) return match[1]
    }
    return null
}

/**
 * Creates a test NFT using tm create command
 * @param pnft - Whether to create a programmable NFT (default: false for regular NFT)
 * @returns The mint address of the created NFT
 */
export const createTmNft = async (pnft: boolean = false): Promise<{ mintAddress: string }> => {
    const cliInput = [
        'tm',
        'create',
        '--name',
        pnft ? 'Test pNFT' : 'Test NFT',
        '--uri',
        'https://example.com/test-nft.json',
        '--type',
        pnft ? 'pnft' : 'nft',
    ]

    const { stdout, stderr, code } = await runCli(cliInput)

    const cleanStderr = stripAnsi(stderr)
    const cleanStdout = stripAnsi(stdout)
    const mintAddress = extractMintAddress(cleanStdout) || extractMintAddress(cleanStderr)

    if (!mintAddress) {
        console.log('stdout:', cleanStdout)
        console.log('stderr:', cleanStderr)
        throw new Error('Mint address not found in NFT creation output')
    }

    expect(code).to.equal(0)
    expect(cleanStderr).to.contain('NFT created successfully')
    expect(mintAddress).to.match(/^[a-zA-Z0-9]+$/)

    // Debug: Print what we're creating
    console.log(`Created ${pnft ? 'pNFT' : 'NFT'} with type flag: ${pnft ? 'pnft' : 'nft'}`)
    console.log('stderr contains:', cleanStderr)

    // Wait a bit for the NFT to be fully confirmed on-chain
    await new Promise(resolve => setTimeout(resolve, 5000))

    return { mintAddress }
}

/**
 * Creates a test regular (non-programmable) NFT
 */
export const createRegularNft = async (): Promise<{ mintAddress: string }> => {
    return createTmNft(false)
}

/**
 * Creates a test programmable NFT
 */
export const createProgrammableNft = async (): Promise<{ mintAddress: string }> => {
    return createTmNft(true)
}
