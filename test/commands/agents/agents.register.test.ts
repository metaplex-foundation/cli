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

    // Requires Irys upload — skip on localnet
    it.skip('registers an existing asset with --from-file (requires Irys)', async () => {
        const { stdout: createStdout, stderr: createStderr, code: createCode } = await runCli([
            'core', 'asset', 'create',
            '--name', 'Register Test Asset',
            '--uri', TEST_ASSET_URI,
        ], ['\n'])

        expect(createCode).to.equal(0)

        const assetId = extractAssetId(stripAnsi(createStdout + createStderr))
        expect(assetId).to.be.ok

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
            const { stdout, stderr, code } = await runCli([
                'agents', 'register',
                assetId!,
                '--from-file', tmpFile,
            ])

            const cleanOut = stripAnsi(stdout + stderr)

            expect(code).to.equal(0)
            expect(cleanOut).to.contain('Agent identity registered successfully')
            expect(cleanOut).to.contain('Asset:')
            expect(cleanOut).to.contain('Registration URI:')
        } finally {
            fs.unlinkSync(tmpFile)
        }
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

    // Requires Irys upload — skip on localnet
    it.skip('registers an existing asset into a collection with --from-file (requires Irys)', async () => {
        const { stdout: colStdout, stderr: colStderr, code: colCode } = await runCli([
            'core', 'collection', 'create',
            '--name', 'Test Collection',
            '--uri', TEST_ASSET_URI,
        ], ['\n'])

        expect(colCode).to.equal(0)

        const collectionId = stripAnsi(colStdout + colStderr).match(/Collection:\s*([a-zA-Z0-9]{32,44})/)?.[1]
        expect(collectionId).to.be.ok

        const { stdout: createStdout, stderr: createStderr, code: createCode } = await runCli([
            'core', 'asset', 'create',
            '--name', 'Collection Agent Asset',
            '--uri', TEST_ASSET_URI,
            '--collection', collectionId!,
        ], ['\n'])

        expect(createCode).to.equal(0)

        const assetId = extractAssetId(stripAnsi(createStdout + createStderr))
        expect(assetId).to.be.ok

        const doc = {
            type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
            name: 'Collection Agent',
            description: 'A collection agent',
            image: 'https://placehold.co/400.png',
            active: true,
        }

        const tmpFile = path.join(os.tmpdir(), `agent-doc-${Date.now()}.json`)
        fs.writeFileSync(tmpFile, JSON.stringify(doc, null, 2))

        try {
            const { stdout, stderr, code } = await runCli([
                'agents', 'register',
                assetId!,
                '--from-file', tmpFile,
                '--collection', collectionId!,
            ])

            expect(code).to.equal(0)
            expect(stripAnsi(stdout + stderr)).to.contain('Agent identity registered successfully')
        } finally {
            fs.unlinkSync(tmpFile)
        }
    })

    it('fails when no document source is provided', async () => {
        try {
            await runCli(['agents', 'register', 'FakeAssetAddressXXXXXXXXXXXXXXXXXXXXXXXXXXXX'])
            expect.fail('Expected error')
        } catch (err: any) {
            expect(err.message).to.contain('--wizard, --from-file, or --name')
        }
    })
})
