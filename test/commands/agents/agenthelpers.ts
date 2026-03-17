import { expect } from 'chai'
import { runCli } from '../../runCli.js'

export const stripAnsi = (str: string) => str.replace(/\u001b\[\d+m/g, '')

export const extractAssetId = (str: string): string | null => {
    const match = str.match(/Asset:\s*([a-zA-Z0-9]{32,44})/)
    return match ? match[1] : null
}

export const extractExecutiveProfile = (str: string): string | null => {
    const match = str.match(/Executive Profile:\s*([a-zA-Z0-9]{32,44})/)
    return match ? match[1] : null
}

// A pre-uploaded agent registration document for use in tests that cannot upload
export const TEST_AGENT_DOC_URI = 'https://gateway.irys.xyz/6oLffDXxbZ3g1TvTg4kApvkkWmEWNpY1ev3Uig4geCsF'

/**
 * Creates a Core asset then registers it as an agent using a pre-existing document URI.
 * Uses the `agents register <asset> --uri` path to avoid any Irys upload on localnet.
 */
export const createRegisteredAgent = async (collectionId?: string): Promise<{ assetId: string }> => {
    const { stdout: createStdout, stderr: createStderr, code: createCode } = await runCli([
        'core', 'asset', 'create',
        '--name', 'Test Agent Asset',
        '--uri', TEST_AGENT_DOC_URI,
        ...(collectionId ? ['--collection', collectionId] : []),
    ], ['\n'])

    expect(createCode).to.equal(0)

    const assetId = extractAssetId(stripAnsi(createStdout + createStderr))
    if (!assetId) throw new Error(`Could not extract asset ID from create output`)

    const { code: registerCode } = await runCli([
        'agents', 'register',
        assetId,
        '--uri', TEST_AGENT_DOC_URI,
    ])

    expect(registerCode).to.equal(0)

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
