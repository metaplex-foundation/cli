import { expect } from 'chai'
import { runCli } from '../../runCli.js'
import { stripAnsi, extractAssetId, TEST_ASSET_URI } from './agenthelpers.js'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const TEST_WALLET = 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx'

describe('agents register', () => {

    before(async () => {
        await runCli(['toolbox', 'sol', 'airdrop', '100', TEST_WALLET])
        await new Promise(resolve => setTimeout(resolve, 10000))
    })

    // ── API path ────────────────────────────────────────────────────────────

    it('uses the API by default (no asset arg, no --use-ix)', async () => {
        try {
            // Will fail (localnet can't reach the Metaplex API) but should attempt the API path
            await runCli([
                'agents', 'register',
                '--name', 'API Agent',
                '--description', 'An API-registered agent',
                '--image', 'https://placehold.co/400.png',
            ])
            expect.fail('Expected error (API not reachable on localnet)')
        } catch (err: any) {
            // Should fail on API call, not on flag parsing
            expect(err.message).to.not.contain('--wizard, --from-file, or --name')
        }
    })

    // ── Direct IX path ──────────────────────────────────────────────────────

    it('uses direct IX when --use-ix is passed', async () => {
        try {
            await runCli([
                'agents', 'register',
                'FakeAssetXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
                '--use-ix',
                '--name', 'IX Agent',
                '--description', 'Direct IX agent',
                '--image', 'https://placehold.co/400.png',
            ])
            expect.fail('Expected error')
        } catch (err: any) {
            expect(err.message).to.not.contain('API')
        }
    })

    it('implies --use-ix when an asset arg is provided', async () => {
        try {
            await runCli([
                'agents', 'register',
                'FakeAssetXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
                '--name', 'Existing Asset Agent',
                '--description', 'Registering existing asset',
                '--image', 'https://placehold.co/400.png',
            ])
            expect.fail('Expected error')
        } catch (err: any) {
            expect(err.message).to.be.ok
        }
    })

    it('implies --use-ix when --from-file is passed', async () => {
        const doc = {
            type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
            name: 'Test Agent',
            description: 'A test agent',
            image: 'https://placehold.co/400.png',
            active: true,
        }

        const tmpFile = path.join(os.tmpdir(), `agent-doc-${Date.now()}.json`)
        fs.writeFileSync(tmpFile, JSON.stringify(doc, null, 2))

        try {
            await runCli([
                'agents', 'register',
                'FakeAssetXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
                '--from-file', tmpFile,
            ])
            expect.fail('Expected error')
        } catch (err: any) {
            expect(err.message).to.be.ok
        } finally {
            fs.unlinkSync(tmpFile)
        }
    })

    it('fails when no document source is provided for --use-ix', async () => {
        try {
            await runCli(['agents', 'register', 'FakeAssetXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', '--use-ix'])
            expect.fail('Expected error')
        } catch (err: any) {
            expect(err.message).to.contain('--wizard, --from-file, or --name')
        }
    })

    // ── Irys-dependent (skip on localnet) ───────────────────────────────────

    it.skip('registers existing asset with --use-ix --from-file (requires Irys)', async () => {
        const { stdout: out, stderr: err, code } = await runCli([
            'core', 'asset', 'create', '--name', 'Register Test', '--uri', TEST_ASSET_URI,
        ], ['\n'])
        expect(code).to.equal(0)
        const assetId = extractAssetId(stripAnsi(out + err))

        const doc = {
            type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
            name: 'Test Agent', description: 'A test agent',
            image: 'https://placehold.co/400.png', active: true,
        }
        const tmpFile = path.join(os.tmpdir(), `agent-doc-${Date.now()}.json`)
        fs.writeFileSync(tmpFile, JSON.stringify(doc, null, 2))

        try {
            const { stdout, stderr, code } = await runCli([
                'agents', 'register', assetId!, '--use-ix', '--from-file', tmpFile,
            ])
            expect(code).to.equal(0)
            expect(stripAnsi(stdout + stderr)).to.contain('Agent identity registered successfully')
        } finally {
            fs.unlinkSync(tmpFile)
        }
    })
})
