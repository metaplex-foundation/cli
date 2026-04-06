import { expect } from 'chai'
import { runCli } from '../../runCli.js'
import { stripAnsi, extractAssetId } from './agenthelpers.js'

const TEST_WALLET = 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx'

describe('agents set-agent-token', () => {

    it('fails when args are missing', async () => {
        try {
            await runCli(['agents', 'set-agent-token'])
            expect.fail('Expected error')
        } catch (err: any) {
            expect(err.message).to.contain('Missing 2 required arg')
        }
    })

    it('fails when the asset has no agent identity', async () => {
        const { stdout: out, stderr: err, code } = await runCli([
            'core', 'asset', 'create', '--name', 'Unregistered Asset', '--uri', 'https://example.com/asset',
        ], ['\n'])
        expect(code).to.equal(0)

        const assetId = extractAssetId(stripAnsi(out + err))
        expect(assetId).to.be.ok

        try {
            await runCli(['agents', 'set-agent-token', assetId!, 'GNS1S5J5AspKXgpjz6SvKL66kPaKWAhaGRhCqPRxii2B'])
            expect.fail('Expected error')
        } catch (err: any) {
            expect(err.message).to.be.ok
        }
    })

    // Full happy-path requires asset-signer mode + a real Genesis account — skip on localnet
    it.skip('sets agent token on a registered agent in asset-signer mode (requires Genesis + Irys)', async () => {})
})
