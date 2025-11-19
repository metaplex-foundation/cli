import { expect } from 'chai'
import { runCli } from '../../runCli'
import { createBubblegumCollection, stripAnsi, extractCollectionId } from './bgcollectionhelpers'

describe('bg collection create command', () => {

    before(async () => {
        // Airdrop SOL to test account for transactions
        await runCli([
            "toolbox", "sol", "airdrop", "100", "TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx"
        ])

        // Wait for airdrop to be processed
        await new Promise(resolve => setTimeout(resolve, 10000))
    })

    it('creates a Bubblegum collection with BubblegumV2 plugin', async () => {
        const { collectionId, signature } = await createBubblegumCollection({
            name: 'Test Bubblegum Collection',
            uri: 'https://example.com/collection.json',
        })

        expect(collectionId).to.match(/^[a-zA-Z0-9]+$/)
        expect(signature).to.match(/^[a-zA-Z0-9]{32,}$/)
    })

    it('creates a collection with royalties', async () => {
        const { collectionId } = await createBubblegumCollection({
            name: 'Royalty Collection',
            uri: 'https://example.com/royalty-collection.json',
            royalties: 10,
        })

        expect(collectionId).to.match(/^[a-zA-Z0-9]+$/)
    })

    it('creates a collection with 0% royalties', async () => {
        const { collectionId } = await createBubblegumCollection({
            name: 'No Royalty Collection',
            uri: 'https://example.com/no-royalty.json',
            royalties: 0,
        })

        expect(collectionId).to.match(/^[a-zA-Z0-9]+$/)
    })

    it('includes collection details in output', async () => {
        const cliInput = [
            'bg',
            'collection',
            'create',
            '--name',
            'Output Test Collection',
            '--uri',
            'https://example.com/output-test.json',
            '--royalties',
            '5',
        ]

        const { stdout, stderr, code } = await runCli(cliInput)
        const combined = stripAnsi(stdout + '\n' + stderr)

        expect(code).to.equal(0)
        expect(combined).to.contain('Collection created with Bubblegum V2 plugin')
        expect(combined).to.contain('Output Test Collection')
        expect(combined).to.contain('Royalties: 5%')
        expect(combined).to.contain('Plugins: BubblegumV2, Royalties')
        expect(combined).to.match(/Collection: [a-zA-Z0-9]+/)
        expect(combined).to.match(/Explorer:.*http/)
    })

    it('includes usage instructions in output', async () => {
        const cliInput = [
            'bg',
            'collection',
            'create',
            '--name',
            'Instructions Test',
            '--uri',
            'https://example.com/instructions.json',
        ]

        const { stdout, stderr, code } = await runCli(cliInput)
        const combined = stripAnsi(stdout + '\n' + stderr)

        expect(code).to.equal(0)
        expect(combined).to.contain('This collection is ready for compressed NFTs')
        expect(combined).to.match(/Use it with: mplx bg nft create/)
    })

    it('creates multiple collections with different names', async () => {
        const collection1 = await createBubblegumCollection({
            name: 'Collection One',
            uri: 'https://example.com/one.json',
        })

        await new Promise(resolve => setTimeout(resolve, 2000))

        const collection2 = await createBubblegumCollection({
            name: 'Collection Two',
            uri: 'https://example.com/two.json',
        })

        expect(collection1.collectionId).to.match(/^[a-zA-Z0-9]+$/)
        expect(collection2.collectionId).to.match(/^[a-zA-Z0-9]+$/)
        expect(collection1.collectionId).to.not.equal(collection2.collectionId)
    })

    it('creates collections with various royalty percentages', async () => {
        const royaltyTests = [0, 5, 10, 50, 100]

        for (const royalty of royaltyTests) {
            const { collectionId } = await createBubblegumCollection({
                name: `Royalty ${royalty}% Collection`,
                uri: `https://example.com/royalty-${royalty}.json`,
                royalties: royalty,
            })

            expect(collectionId).to.match(/^[a-zA-Z0-9]+$/)
            await new Promise(resolve => setTimeout(resolve, 1000))
        }
    })

    it('validates required name flag', async () => {
        const cliInput = [
            'bg',
            'collection',
            'create',
            '--uri',
            'https://example.com/no-name.json',
        ]

        try {
            await runCli(cliInput)
            expect.fail('Should have thrown an error for missing name')
        } catch (error) {
            // Expected to fail
            expect(error).to.exist
        }
    })

    it('validates required uri flag', async () => {
        const cliInput = [
            'bg',
            'collection',
            'create',
            '--name',
            'No URI Collection',
        ]

        try {
            await runCli(cliInput)
            expect.fail('Should have thrown an error for missing URI')
        } catch (error) {
            // Expected to fail
            expect(error).to.exist
        }
    })
})
