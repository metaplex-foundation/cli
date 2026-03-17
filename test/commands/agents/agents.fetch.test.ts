import { expect } from 'chai'
import { runCli } from '../../runCli.js'
import { stripAnsi, createRegisteredAgent } from './agenthelpers.js'

const TEST_WALLET = 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx'

describe('agents fetch', () => {

    before(async () => {
        await runCli(['toolbox', 'sol', 'airdrop', '100', TEST_WALLET])
        await new Promise(resolve => setTimeout(resolve, 10000))
    })

    it('fetches a registered agent and returns identity data', async () => {
        const { assetId } = await createRegisteredAgent()

        const { stdout, stderr, code } = await runCli(['agents', 'fetch', assetId])

        const cleanOut = stripAnsi(stdout + stderr)

        expect(code).to.equal(0)
        expect(cleanOut).to.contain('registered: true')
        expect(cleanOut).to.contain('asset:')
        expect(cleanOut).to.contain(assetId)
        expect(cleanOut).to.contain('identityPda:')
        expect(cleanOut).to.contain('wallet:')
        expect(cleanOut).to.contain('owner:')
    })

    it('reports unregistered when asset has no agent identity', async () => {
        const { stdout: createStdout, stderr: createStderr, code: createCode } = await runCli([
            'core', 'asset', 'create',
            '--name', 'Unregistered Asset',
            '--uri', 'https://example.com/asset',
        ], ['\n'])

        expect(createCode).to.equal(0)

        const assetId = stripAnsi(createStdout + createStderr).match(/Asset:\s*([a-zA-Z0-9]{32,44})/)?.[1]
        expect(assetId).to.be.ok

        const { stdout, stderr, code } = await runCli(['agents', 'fetch', assetId!])

        expect(code).to.equal(0)
        expect(stripAnsi(stdout + stderr)).to.contain('No agent identity found')
    })

    it('fails with an invalid asset address', async () => {
        try {
            await runCli(['agents', 'fetch', 'notavalidaddress'])
            expect.fail('Expected error')
        } catch (err: any) {
            expect(err.message).to.be.ok
        }
    })
})
