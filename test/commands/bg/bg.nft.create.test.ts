import { expect } from 'chai'
import { runCli } from '../../runCli'
import { createBubblegumTree, createCompressedNFT, fetchMintedLeaf, stripAnsi } from './bghelpers'
import { createBubblegumCollection } from './bgcollectionhelpers'

describe('bg nft create command', () => {
    let testTree: string

    before(async () => {
        // Airdrop SOL to test account for transactions
        await runCli([
            "toolbox", "sol", "airdrop", "100", "TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx"
        ])

        // Wait for airdrop to be processed
        await new Promise(resolve => setTimeout(resolve, 10000))

        // Create a test tree for NFT creation
        const { treeAddress } = await createBubblegumTree({
            maxDepth: 14,
            maxBufferSize: 64,
            canopyDepth: 8,
        })
        testTree = treeAddress

        // Wait a bit for tree to be ready
        await new Promise(resolve => setTimeout(resolve, 2000))
    })

    it('creates a compressed NFT with name and uri', async () => {
        const { signature, owner } = await createCompressedNFT({
            tree: testTree,
            name: 'Test Compressed NFT',
            uri: 'https://example.com/nft-metadata.json',
        })

        expect(signature).to.match(/^[a-zA-Z0-9]{32,}$/)
        expect(owner).to.match(/^[a-zA-Z0-9]{32,44}$/)
    })

    it('creates a compressed NFT with royalties', async () => {
        const { signature } = await createCompressedNFT({
            tree: testTree,
            name: 'NFT with Royalties',
            uri: 'https://example.com/nft2.json',
            royalties: 5,
        })

        expect(signature).to.match(/^[a-zA-Z0-9]{32,}$/)
    })

    it('creates a compressed NFT with symbol', async () => {
        const { signature } = await createCompressedNFT({
            tree: testTree,
            name: 'NFT with Symbol',
            uri: 'https://example.com/nft3.json',
            symbol: 'TEST',
        })

        expect(signature).to.match(/^[a-zA-Z0-9]{32,}$/)
    })

    it('creates a compressed NFT into a collection', async () => {
        // Create a Bubblegum collection first
        const { collectionId } = await createBubblegumCollection()

        // Wait for collection to be created
        await new Promise(resolve => setTimeout(resolve, 2000))

        const { signature } = await createCompressedNFT({
            tree: testTree,
            name: 'NFT in Collection',
            uri: 'https://example.com/nft4.json',
            collection: collectionId,
        })

        expect(signature).to.match(/^[a-zA-Z0-9]{32,}$/)
    })

    it('includes transaction details in output', async () => {
        const cliInput = [
            'bg',
            'nft',
            'create',
            testTree,
            '--name',
            'Test NFT Details',
            '--uri',
            'https://example.com/nft5.json',
        ]

        const { stdout, stderr, code } = await runCli(cliInput)
        const combined = stripAnsi(stdout + '\n' + stderr)

        expect(code).to.equal(0)
        expect(combined).to.contain('Compressed NFT created')
        expect(combined).to.match(/Owner:/)
        expect(combined).to.match(/Signature:/)
        expect(combined).to.match(/Explorer:.*http/)
    })

    it('creates multiple NFTs in the same tree', async () => {
        const nft1 = await createCompressedNFT({
            tree: testTree,
            name: 'Multi NFT 1',
            uri: 'https://example.com/multi1.json',
        })

        const nft2 = await createCompressedNFT({
            tree: testTree,
            name: 'Multi NFT 2',
            uri: 'https://example.com/multi2.json',
        })

        const nft3 = await createCompressedNFT({
            tree: testTree,
            name: 'Multi NFT 3',
            uri: 'https://example.com/multi3.json',
        })

        expect(nft1.signature).to.match(/^[a-zA-Z0-9]{32,}$/)
        expect(nft2.signature).to.match(/^[a-zA-Z0-9]{32,}$/)
        expect(nft3.signature).to.match(/^[a-zA-Z0-9]{32,}$/)

        // All NFTs should have different signatures
        expect(nft1.signature).to.not.equal(nft2.signature)
        expect(nft2.signature).to.not.equal(nft3.signature)
        expect(nft1.signature).to.not.equal(nft3.signature)
    })

    it('handles royalties at 0%', async () => {
        const { signature } = await createCompressedNFT({
            tree: testTree,
            name: 'No Royalties NFT',
            uri: 'https://example.com/no-royalties.json',
            royalties: 0,
        })

        expect(signature).to.match(/^[a-zA-Z0-9]{32,}$/)
    })

    it('handles royalties at maximum 100%', async () => {
        const { signature } = await createCompressedNFT({
            tree: testTree,
            name: 'Max Royalties NFT',
            uri: 'https://example.com/max-royalties.json',
            royalties: 100,
        })

        expect(signature).to.match(/^[a-zA-Z0-9]{32,}$/)
    })

    it('inherits royalties from a collection with a Royalties plugin', async () => {
        const { collectionId } = await createBubblegumCollection({ royalties: 5 })
        await new Promise(resolve => setTimeout(resolve, 2000))

        const { signature, royaltyMode } = await createCompressedNFT({
            tree: testTree,
            name: 'Auto Inherit NFT',
            uri: 'https://example.com/auto-inherit.json',
            collection: collectionId,
        })

        expect(signature).to.match(/^[a-zA-Z0-9]{32,}$/)
        expect(royaltyMode).to.equal('inherited (leaf sentinel 65535)')

        const leaf = await fetchMintedLeaf(signature)
        expect(leaf.metadata.sellerFeeBasisPoints).to.equal(65535)
        expect(leaf.metadata.creators).to.deep.equal([])
    })

    it('inherits royalties when --inherit-royalties is passed', async () => {
        const { collectionId } = await createBubblegumCollection({ royalties: 8 })
        await new Promise(resolve => setTimeout(resolve, 2000))

        const { signature, royaltyMode } = await createCompressedNFT({
            tree: testTree,
            name: 'Force Inherit NFT',
            uri: 'https://example.com/force-inherit.json',
            collection: collectionId,
            inheritRoyalties: true,
        })

        expect(signature).to.match(/^[a-zA-Z0-9]{32,}$/)
        expect(royaltyMode).to.equal('inherited (leaf sentinel 65535)')

        const leaf = await fetchMintedLeaf(signature)
        expect(leaf.metadata.sellerFeeBasisPoints).to.equal(65535)
        expect(leaf.metadata.creators).to.deep.equal([])
    })

    it('creates explicit leaf royalties with creator splits', async () => {
        const { collectionId } = await createBubblegumCollection({ royalties: 5 })
        await new Promise(resolve => setTimeout(resolve, 2000))

        const { signature, royaltyMode } = await createCompressedNFT({
            tree: testTree,
            name: 'Creator Split NFT',
            uri: 'https://example.com/creator-split.json',
            collection: collectionId,
            royalties: 7.5,
            creators: [
                'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx:60',
                '11111111111111111111111111111111:40',
            ],
        })

        expect(signature).to.match(/^[a-zA-Z0-9]{32,}$/)
        expect(royaltyMode).to.equal('explicit 750 bps')

        const leaf = await fetchMintedLeaf(signature)
        expect(leaf.metadata.sellerFeeBasisPoints).to.equal(750)
        expect(leaf.metadata.creators.map((creator) => ({
            address: creator.address.toString(),
            share: creator.share,
        }))).to.deep.equal([
            { address: 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx', share: 60 },
            { address: '11111111111111111111111111111111', share: 40 },
        ])
    })

    it('rejects --inherit-royalties when the collection has no Royalties plugin', async () => {
        const { collectionId } = await createBubblegumCollection()
        await new Promise(resolve => setTimeout(resolve, 2000))

        const cliInput = [
            'bg',
            'nft',
            'create',
            testTree,
            '--name',
            'Bad Inherit NFT',
            '--uri',
            'https://example.com/bad-inherit.json',
            '--collection',
            collectionId,
            '--inherit-royalties',
        ]

        try {
            await runCli(cliInput)
            expect.fail('Should have thrown an error')
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            expect(errorMessage).to.match(/Process failed with code \d+/)
            expect(stripAnsi(errorMessage)).to.match(/does not have a Royalties plugin/)
        }
    })

    it('creates NFT with all optional parameters', async () => {
        const { collectionId } = await createBubblegumCollection()
        await new Promise(resolve => setTimeout(resolve, 2000))

        const { signature } = await createCompressedNFT({
            tree: testTree,
            name: 'Full Options NFT',
            uri: 'https://example.com/full-options.json',
            collection: collectionId,
            royalties: 10,
            symbol: 'FULL',
        })

        expect(signature).to.match(/^[a-zA-Z0-9]{32,}$/)
    })
})
