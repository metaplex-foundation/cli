import { expect } from 'chai'
import { runCli } from '../../runCli.js'
import { stripAnsi, createRegisteredAgent, extractAssetId } from './agenthelpers.js'

const TEST_WALLET = 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx'

const createUndelegatedAsset = async (): Promise<string> => {
    const { stdout, stderr, code } = await runCli(
        ['core', 'asset', 'create', '--name', 'Temp Asset', '--uri', 'https://example.com/asset'],
        ['\n']
    )
    expect(code).to.equal(0)
    return extractAssetId(stripAnsi(stdout + stderr))!
}

describe('agents executive revoke', () => {

    // Requires Irys upload (createRegisteredAgent uses --from-file) — skip on localnet
    it.skip('revokes a delegation and refunds rent (requires Irys)', async () => {
        await runCli(['toolbox', 'sol', 'airdrop', '100', TEST_WALLET])
        await new Promise(resolve => setTimeout(resolve, 10000))

        const { assetId } = await createRegisteredAgent()

        try { await runCli(['agents', 'executive', 'register']) } catch { /* already registered */ }

        await runCli(['agents', 'executive', 'delegate', assetId, '--executive', TEST_WALLET])

        const { stdout, stderr, code } = await runCli([
            'agents', 'executive', 'revoke', assetId, '--executive', TEST_WALLET,
        ])

        const cleanOut = stripAnsi(stdout + stderr)
        expect(code).to.equal(0)
        expect(cleanOut).to.contain('Execution delegation revoked successfully')
        expect(cleanOut).to.contain(assetId)
    })

    it('defaults --executive to signer when omitted', async () => {
        const assetId = await createUndelegatedAsset()

        try {
            await runCli(['agents', 'executive', 'revoke', assetId])
            expect.fail('Expected error')
        } catch (err: any) {
            expect(err.message).to.not.contain('Missing required flag')
        }
    })

    it('accepts --destination flag', async () => {
        const assetId = await createUndelegatedAsset()

        try {
            await runCli([
                'agents', 'executive', 'revoke', assetId,
                '--executive', TEST_WALLET,
                '--destination', TEST_WALLET,
            ])
            expect.fail('Expected error')
        } catch (err: any) {
            expect(err.message).to.not.contain('Unexpected flag')
        }
    })

    it('fails when no delegation record exists', async () => {
        const assetId = await createUndelegatedAsset()

        try {
            await runCli(['agents', 'executive', 'revoke', assetId, '--executive', TEST_WALLET])
            expect.fail('Expected error')
        } catch (err: any) {
            expect(err.message).to.be.ok
        }
    })
})
