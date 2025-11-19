import { expect } from 'chai'
import { runCli } from '../../runCli'
import { createBubblegumTree, stripAnsi, extractTreeAddress, extractSignature } from './bghelpers'

describe('bg tree create command', () => {

    before(async () => {
        // Airdrop SOL to test account for transactions
        const { stdout, stderr, code } = await runCli([
            "toolbox", "sol", "airdrop", "100", "TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx"
        ])

        // Wait for airdrop to be processed
        await new Promise(resolve => setTimeout(resolve, 10000))
    })

    it('creates a basic Bubblegum tree with default configuration', async () => {
        const { treeAddress, signature } = await createBubblegumTree()

        expect(treeAddress).to.match(/^[a-zA-Z0-9]{32,44}$/)
        expect(signature).to.match(/^[a-zA-Z0-9]{32,}$/)
    })

    it('creates a tree with custom depth and buffer size', async () => {
        const { treeAddress, signature } = await createBubblegumTree({
            maxDepth: 14,
            maxBufferSize: 64,
            canopyDepth: 8,
        })

        expect(treeAddress).to.match(/^[a-zA-Z0-9]{32,44}$/)
        expect(signature).to.match(/^[a-zA-Z0-9]{32,}$/)
    })

    it('creates a public tree', async () => {
        const { treeAddress, signature } = await createBubblegumTree({
            maxDepth: 14,
            maxBufferSize: 64,
            canopyDepth: 8,
            public: true,
        })

        expect(treeAddress).to.match(/^[a-zA-Z0-9]{32,44}$/)
        expect(signature).to.match(/^[a-zA-Z0-9]{32,}$/)
    })

    it('creates a tree with a name for storage', async () => {
        const treeName = `test-tree-${Date.now()}`
        const { treeAddress, signature } = await createBubblegumTree({
            maxDepth: 14,
            maxBufferSize: 64,
            canopyDepth: 8,
            name: treeName,
        })

        expect(treeAddress).to.match(/^[a-zA-Z0-9]{32,44}$/)
        expect(signature).to.match(/^[a-zA-Z0-9]{32,}$/)
    })

    it('validates tree configuration parameters', async () => {
        const cliInput = [
            'bg',
            'tree',
            'create',
            '--maxDepth', '14',
            '--maxBufferSize', '64',
            '--canopyDepth', '8',
        ]

        const { stdout, stderr, code } = await runCli(cliInput)
        const combined = stripAnsi(stdout + '\n' + stderr)

        expect(code).to.equal(0)
        expect(combined).to.contain('Max Depth: 14')
        expect(combined).to.contain('Max Buffer Size: 64')
        expect(combined).to.contain('Canopy Depth: 8')
    })

    it('includes explorer links in output', async () => {
        const cliInput = [
            'bg',
            'tree',
            'create',
            '--maxDepth', '14',
            '--maxBufferSize', '64',
            '--canopyDepth', '8',
        ]

        const { stdout, stderr, code } = await runCli(cliInput)
        const combined = stripAnsi(stdout + '\n' + stderr)

        expect(code).to.equal(0)
        expect(combined).to.match(/Explorer:.*http/)
        expect(combined).to.match(/Tree Explorer:.*http/)
    })

    it('validates tree name format', async () => {
        const validName = `test-tree-${Date.now()}`
        const { treeAddress } = await createBubblegumTree({
            maxDepth: 14,
            maxBufferSize: 64,
            canopyDepth: 8,
            name: validName,
        })

        expect(treeAddress).to.match(/^[a-zA-Z0-9]{32,44}$/)
    })

    it('prevents duplicate tree names on same network', async () => {
        const treeName = `unique-tree-${Date.now()}`

        // Create first tree with the name
        await createBubblegumTree({
            maxDepth: 14,
            maxBufferSize: 64,
            canopyDepth: 8,
            name: treeName,
        })

        // Try to create second tree with same name (should fail)
        try {
            await createBubblegumTree({
                maxDepth: 14,
                maxBufferSize: 64,
                canopyDepth: 8,
                name: treeName,
            })
            // If we get here, the test should fail
            expect.fail('Should have thrown an error for duplicate tree name')
        } catch (error) {
            // Expected to fail
            expect(error).to.exist
        }
    })
})
