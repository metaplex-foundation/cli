import { expect } from "chai"
import { runCli } from "../../runCli"

// Helper to strip ANSI color codes
const stripAnsi = (str: string) => str.replace(/\u001b\[\d+m/g, '')

// Helper to extract asset ID from message
const extractAssetId = (str: string) => {
    // Try different patterns that might contain the asset ID
    const patterns = [
        /Asset: ([a-zA-Z0-9]+)/,           // Create command stdout
        /Asset created with ID: ([a-zA-Z0-9]+)/  // Create command stderr
    ]

    for (const pattern of patterns) {
        const match = str.match(pattern)
        if (match) return match[1]
    }
    return null
}

// Helper to extract collection ID from message
const extractCollectionId = (str: string) => {
    // Try different patterns that might contain the collection ID
    const patterns = [
        /Collection: ([a-zA-Z0-9]+)/,           // Create command stdout
        /Collection created with ID: ([a-zA-Z0-9]+)/  // Create command stderr
    ]

    for (const pattern of patterns) {
        const match = str.match(pattern)
        if (match) return match[1]
    }
    return null
}

const createCoreAsset = async (collectionId?: string): Promise<{ assetId: string }> => {
    const cliInput = [
        'core',
        'asset',
        'create',
        '--name',
        'Test Asset',
        '--uri',
        'https://example.com/test-asset'
    ]

    if (collectionId) {
        cliInput.push('--collection', collectionId)
    }

    const cliStdin = ['\n']

    const { stdout, stderr, code } = await runCli(
        cliInput,
        cliStdin
    )

    // console.log('Test completed')
    // console.log('Final stdout:', stdout)
    // console.log('Final stderr:', stderr)
    // console.log('Exit code:', code)

    const cleanStderr = stripAnsi(stderr)
    const cleanStdout = stripAnsi(stdout)
    const assetId = extractAssetId(cleanStdout) || extractAssetId(cleanStderr)

    if (!assetId) {
        throw new Error('Asset ID not found')
    }

    expect(code).to.equal(0)
    expect(cleanStderr).to.contain('Asset created successfully')
    expect(assetId).to.match(/^[a-zA-Z0-9]+$/)

    return { assetId }
}

const createCoreCollection = async (): Promise<{ collectionId: string }> => {
    const cliInput = [
        'core',
        'collection',
        'create',
        '--name',
        'Test Collection',
        '--uri',
        'https://example.com/test-collection'
    ]
    const cliStdin = ['\n']

    const { stdout, stderr, code } = await runCli(
        cliInput,
        cliStdin
    )

    // console.log('Test completed')
    // console.log('Final stdout:', stdout)
    // console.log('Final stderr:', stderr)
    // console.log('Exit code:', code)

    const cleanStderr = stripAnsi(stderr)
    const cleanStdout = stripAnsi(stdout)
    const collectionId = extractCollectionId(cleanStdout) || extractCollectionId(cleanStderr)

    if (!collectionId) {
        throw new Error('Collection ID not found')
    }

    expect(code).to.equal(0)
    expect(cleanStderr).to.contain('Collection created successfully')
    expect(collectionId).to.match(/^[a-zA-Z0-9]+$/)

    return { collectionId }
}

export { createCoreAsset, createCoreCollection, extractAssetId, extractCollectionId, stripAnsi }