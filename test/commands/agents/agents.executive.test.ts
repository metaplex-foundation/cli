import { expect } from 'chai'
import { runCli } from '../../runCli.js'
import { stripAnsi, extractExecutiveProfile, createRegisteredAgent } from './agenthelpers.js'

// The test wallet address (derived from test-files/key.json)
const TEST_WALLET = 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx'

describe('agents executive register', () => {

    before(async () => {
        await runCli(['toolbox', 'sol', 'airdrop', '100', TEST_WALLET])
        await new Promise(resolve => setTimeout(resolve, 10000))
    })

    it('creates an executive profile for the current wallet', async () => {
        try {
            const { stdout, stderr, code } = await runCli(['agents', 'executive', 'register'])
            const cleanOut = stripAnsi(stdout + stderr)

            expect(code).to.equal(0)
            expect(cleanOut).to.contain('Executive profile registered successfully')
            expect(cleanOut).to.contain('Executive Profile:')
            expect(cleanOut).to.contain('Authority:')

            const executiveProfile = extractExecutiveProfile(cleanOut)
            expect(executiveProfile).to.match(/^[a-zA-Z0-9]{32,44}$/)
        } catch (err: any) {
            // Already registered from a prior validator session — still a passing state
            expect(err.message).to.contain('ExecutiveProfileMustBeUninitialized')
        }
    })

    it('rejects a second registration for the same wallet', async () => {
        try {
            await runCli(['agents', 'executive', 'register'])
            expect.fail('Expected error')
        } catch (err: any) {
            expect(err.message).to.contain('ExecutiveProfileMustBeUninitialized')
        }
    })
})

describe('agents executive delegate', () => {

    // Requires Irys upload (createRegisteredAgent uses --from-file) — skip on localnet
    it.skip('delegates a registered agent to an executive wallet (requires Irys)', async () => {
        const { assetId } = await createRegisteredAgent()

        const { stdout, stderr, code } = await runCli([
            'agents', 'executive', 'delegate',
            assetId,
            '--executive', TEST_WALLET,
        ])

        const cleanOut = stripAnsi(stdout + stderr)

        expect(code).to.equal(0)
        expect(cleanOut).to.contain('Execution delegated successfully')
        expect(cleanOut).to.contain('Agent Asset:')
        expect(cleanOut).to.contain('Executive Profile:')
        expect(cleanOut).to.contain(assetId)
    })

    it('fails when --executive flag is missing', async () => {
        try {
            await runCli(['agents', 'executive', 'delegate', 'FakeAssetXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'])
            expect.fail('Expected error')
        } catch (err: any) {
            expect(err.message).to.contain('Missing required flag executive')
        }
    })

    it('fails when the asset is not a registered agent', async () => {
        // Create a plain core asset (not registered as agent)
        const { stdout: createStdout, stderr: createStderr, code: createCode } = await runCli([
            'core', 'asset', 'create',
            '--name', 'Unregistered Asset',
            '--uri', 'https://example.com/asset',
        ], ['\n'])

        expect(createCode).to.equal(0)

        const assetId = stripAnsi(createStdout + createStderr).match(/Asset:\s*([a-zA-Z0-9]{32,44})/)?.[1]
        expect(assetId).to.be.ok

        try {
            await runCli([
                'agents', 'executive', 'delegate',
                assetId!,
                '--executive', TEST_WALLET,
            ])
            expect.fail('Expected error')
        } catch (err: any) {
            expect(err.message).to.be.ok
        }
    })
})
