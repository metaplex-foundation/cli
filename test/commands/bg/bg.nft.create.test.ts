import { expect } from 'chai'
import { runCli } from '../../runCli'
import { createBubblegumTree, createCompressedNFT, stripAnsi } from './bghelpers'
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
