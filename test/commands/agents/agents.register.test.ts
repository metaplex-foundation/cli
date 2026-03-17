import { expect } from 'chai'
import { runCli } from '../../runCli.js'
import { stripAnsi, extractAssetId, extractExecutiveProfile, TEST_AGENT_DOC_URI } from './agenthelpers.js'

const TEST_WALLET = 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx'

describe('agents register', () => {

    before(async () => {
        await runCli(['toolbox', 'sol', 'airdrop', '100', TEST_WALLET])
        await new Promise(resolve => setTimeout(resolve, 10000))
    })

    // Registers against an existing asset using a pre-uploaded document URI — no Irys needed
    it('registers an existing asset with --uri', async () => {
        // Create a core asset first
        const { stdout: createStdout, stderr: createStderr, code: createCode } = await runCli([
            'core', 'asset', 'create',
            '--name', 'Register Test Asset',
            '--uri', TEST_AGENT_DOC_URI,
        ], ['\n'])

        expect(createCode).to.equal(0)

        const assetId = extractAssetId(stripAnsi(createStdout + createStderr))
        expect(assetId).to.be.ok

        // Register the agent identity
        const { stdout, stderr, code } = await runCli([
            'agents', 'register',
            assetId!,
            '--uri', TEST_AGENT_DOC_URI,
        ])

        const cleanOut = stripAnsi(stdout + stderr)

        expect(code).to.equal(0)
        expect(cleanOut).to.contain('Agent identity registered successfully')
        expect(cleanOut).to.contain('Asset:')
        expect(cleanOut).to.contain('Registration URI:')
        expect(cleanOut).to.contain(TEST_AGENT_DOC_URI)
    })

    // Requires Irys upload — skip on localnet
    it.skip('registers a new asset with --new --name --description --image (requires Irys)', async () => {
        const { stdout, stderr, code } = await runCli([
            'agents', 'register',
            '--new',
            '--name', 'New Agent',
            '--description', 'A brand new agent',
            '--image', 'https://placehold.co/400.png',
        ])

        const cleanOut = stripAnsi(stdout + stderr)

        expect(code).to.equal(0)
        expect(cleanOut).to.contain('Agent identity registered successfully')
        expect(cleanOut).to.contain('Asset:')
    })

    // Requires Irys upload — skip on localnet
    it.skip('registers a new asset with --new --name and --services JSON (requires Irys)', async () => {
        const services = JSON.stringify([{ name: 'MCP', endpoint: 'https://myagent.com/mcp', version: '1.0' }])

        const { stdout, stderr, code } = await runCli([
            'agents', 'register',
            '--new',
            '--name', 'Service Agent',
            '--description', 'Agent with services',
            '--image', 'https://placehold.co/400.png',
            '--services', services,
        ])

        const cleanOut = stripAnsi(stdout + stderr)

        expect(code).to.equal(0)
        expect(cleanOut).to.contain('Agent identity registered successfully')
    })

    it('registers an existing asset into a collection with --uri', async () => {
        // Create collection
        const { stdout: colStdout, stderr: colStderr, code: colCode } = await runCli([
            'core', 'collection', 'create',
            '--name', 'Test Collection',
            '--uri', TEST_AGENT_DOC_URI,
        ], ['\n'])

        expect(colCode).to.equal(0)

        const collectionId = stripAnsi(colStdout + colStderr).match(/Collection:\s*([a-zA-Z0-9]{32,44})/)?.[1]
        expect(collectionId).to.be.ok

        // Create asset in collection
        const { stdout: createStdout, stderr: createStderr, code: createCode } = await runCli([
            'core', 'asset', 'create',
            '--name', 'Collection Agent Asset',
            '--uri', TEST_AGENT_DOC_URI,
            '--collection', collectionId!,
        ], ['\n'])

        expect(createCode).to.equal(0)

        const assetId = extractAssetId(stripAnsi(createStdout + createStderr))
        expect(assetId).to.be.ok

        // Register
        const { stdout, stderr, code } = await runCli([
            'agents', 'register',
            assetId!,
            '--uri', TEST_AGENT_DOC_URI,
            '--collection', collectionId!,
        ])

        expect(code).to.equal(0)
        expect(stripAnsi(stdout + stderr)).to.contain('Agent identity registered successfully')
    })

    it('fails when no document source is provided', async () => {
        try {
            await runCli(['agents', 'register', 'FakeAssetAddressXXXXXXXXXXXXXXXXXXXXXXXXXXXX'])
            expect.fail('Expected error')
        } catch (err: any) {
            expect(err.message).to.contain('--wizard, --uri, --from-file, or --name')
        }
    })
})
