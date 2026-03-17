import { expect } from 'chai'
import { runCli } from '../../runCli.js'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export const stripAnsi = (str: string) => str.replace(/\u001b\[\d+m/g, '')

export const extractAssetId = (str: string): string | null => {
    const match = str.match(/Asset:\s*([a-zA-Z0-9]{32,44})/)
    return match ? match[1] : null
}

export const extractExecutiveProfile = (str: string): string | null => {
    const match = str.match(/Executive Profile:\s*([a-zA-Z0-9]{32,44})/)
    return match ? match[1] : null
}

// A generic URI used as a placeholder for core asset metadata in tests that don't upload
export const TEST_ASSET_URI = 'https://example.com/asset.json'

/**
 * Creates a Core asset then registers it as an agent.
 * Writes a minimal registration document to a temp file and uses --from-file.
 * NOTE: Requires Irys upload — tests using this helper must be marked .skip on localnet.
 */
export const createRegisteredAgent = async (collectionId?: string): Promise<{ assetId: string }> => {
    const { stdout: createStdout, stderr: createStderr, code: createCode } = await runCli([
        'core', 'asset', 'create',
        '--name', 'Test Agent Asset',
        '--uri', TEST_ASSET_URI,
        ...(collectionId ? ['--collection', collectionId] : []),
    ], ['\n'])

    expect(createCode).to.equal(0)

    const assetId = extractAssetId(stripAnsi(createStdout + createStderr))
    if (!assetId) throw new Error(`Could not extract asset ID from create output`)

    // Write a minimal agent registration document to a temp file
    const doc = {
        type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
        name: 'Test Agent',
        description: 'A test agent for integration tests',
        image: 'https://placehold.co/400.png',
        active: true,
    }

    const tmpFile = path.join(os.tmpdir(), `agent-doc-${Date.now()}.json`)
    fs.writeFileSync(tmpFile, JSON.stringify(doc, null, 2))

    try {
        const { code: registerCode } = await runCli([
            'agents', 'register',
            assetId,
            '--from-file', tmpFile,
        ])

        expect(registerCode).to.equal(0)
    } finally {
        fs.unlinkSync(tmpFile)
    }

    return { assetId }
}

/**
 * Registers an executive profile for the current test wallet.
 */
export const registerExecutiveProfile = async (): Promise<{ executiveProfile: string }> => {
    const { stdout, stderr, code } = await runCli(['agents', 'executive', 'register'])

    expect(code).to.equal(0)

    const executiveProfile = extractExecutiveProfile(stripAnsi(stdout + stderr))
    if (!executiveProfile) throw new Error(`Could not extract executive profile from output`)

    return { executiveProfile }
}
