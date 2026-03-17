import { expect } from 'chai'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { runCli } from '../../runCli.js'
import { stripAnsi, TEST_AGENT_DOC_URI } from './agenthelpers.js'

describe('agents document', () => {

    it('saves a document locally with --name flags and --no-upload', async () => {
        const outputPath = path.join(os.tmpdir(), `agent-doc-test-${Date.now()}.json`)

        const { stdout, stderr, code } = await runCli([
            'agents', 'document',
            '--name', 'Test Agent',
            '--description', 'A test agent document',
            '--image', 'https://placehold.co/400.png',
            '--output', outputPath,
            '--no-upload',
        ])

        expect(code).to.equal(0)
        expect(fs.existsSync(outputPath)).to.be.true

        const doc = JSON.parse(fs.readFileSync(outputPath, 'utf-8'))
        expect(doc.type).to.equal('agent-registration-v1')
        expect(doc.name).to.equal('Test Agent')
        expect(doc.description).to.equal('A test agent document')
        expect(doc.image).to.equal('https://placehold.co/400.png')

        fs.unlinkSync(outputPath)
    })

    it('saves a document with --services JSON and --no-upload', async () => {
        const outputPath = path.join(os.tmpdir(), `agent-doc-services-test-${Date.now()}.json`)
        const services = JSON.stringify([
            { name: 'MCP', endpoint: 'https://myagent.com/mcp', version: '1.0', skills: ['search'] },
        ])

        const { code } = await runCli([
            'agents', 'document',
            '--name', 'Service Agent',
            '--description', 'Agent with services',
            '--image', 'https://placehold.co/400.png',
            '--services', services,
            '--output', outputPath,
            '--no-upload',
        ])

        expect(code).to.equal(0)

        const doc = JSON.parse(fs.readFileSync(outputPath, 'utf-8'))
        expect(doc.services).to.have.length(1)
        expect(doc.services[0].name).to.equal('MCP')
        expect(doc.services[0].version).to.equal('1.0')
        expect(doc.services[0].skills).to.deep.equal(['search'])

        fs.unlinkSync(outputPath)
    })

    it('saves a document with --supported-trust JSON and --no-upload', async () => {
        const outputPath = path.join(os.tmpdir(), `agent-doc-trust-test-${Date.now()}.json`)

        const { code } = await runCli([
            'agents', 'document',
            '--name', 'Trusted Agent',
            '--description', 'Agent with trust models',
            '--image', 'https://placehold.co/400.png',
            '--supported-trust', '["reputation","tee-attestation"]',
            '--output', outputPath,
            '--no-upload',
        ])

        expect(code).to.equal(0)

        const doc = JSON.parse(fs.readFileSync(outputPath, 'utf-8'))
        expect(doc.supportedTrust).to.deep.equal(['reputation', 'tee-attestation'])

        fs.unlinkSync(outputPath)
    })

    it('reads an existing file with --from-file and --no-upload saves it locally', async () => {
        // Write a valid doc to a temp file
        const inputPath = path.join(os.tmpdir(), `agent-doc-input-${Date.now()}.json`)
        const outputPath = path.join(os.tmpdir(), `agent-doc-output-${Date.now()}.json`)

        const doc = {
            type: 'agent-registration-v1',
            name: 'From File Agent',
            description: 'Loaded from file',
            image: 'https://placehold.co/400.png',
            active: true,
        }
        fs.writeFileSync(inputPath, JSON.stringify(doc))

        const { code } = await runCli([
            'agents', 'document',
            '--from-file', inputPath,
            '--output', outputPath,
            '--no-upload',
        ])

        expect(code).to.equal(0)
        expect(fs.existsSync(outputPath)).to.be.true

        const result = JSON.parse(fs.readFileSync(outputPath, 'utf-8'))
        expect(result.name).to.equal('From File Agent')

        fs.unlinkSync(inputPath)
        fs.unlinkSync(outputPath)
    })

    it('fails when --from-file contains an invalid document type', async () => {
        const inputPath = path.join(os.tmpdir(), `agent-doc-bad-${Date.now()}.json`)
        fs.writeFileSync(inputPath, JSON.stringify({ type: 'wrong-type', name: 'Bad' }))

        try {
            await runCli([
                'agents', 'document',
                '--from-file', inputPath,
                '--no-upload',
                '--output', '/dev/null',
            ])
            expect.fail('Expected error')
        } catch (err: any) {
            expect(err.message).to.contain('agent-registration-v1')
        } finally {
            fs.unlinkSync(inputPath)
        }
    })

    it('fails when no document source is provided', async () => {
        try {
            await runCli(['agents', 'document'])
            expect.fail('Expected error')
        } catch (err: any) {
            expect(err.message).to.contain('--wizard, --from-file, or --name')
        }
    })

    // Requires Irys upload — skip on localnet
    it.skip('uploads a document and returns a URI (requires Irys)', async () => {
        const { stdout, stderr, code } = await runCli([
            'agents', 'document',
            '--name', 'Uploaded Agent',
            '--description', 'Will be uploaded',
            '--image', 'https://placehold.co/400.png',
        ])

        const cleanOut = stripAnsi(stdout + stderr)

        expect(code).to.equal(0)
        expect(cleanOut).to.contain('Registration URI:')
        expect(cleanOut).to.match(/https?:\/\//)
    })
})
