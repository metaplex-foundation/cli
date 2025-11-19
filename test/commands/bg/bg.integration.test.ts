import { expect } from 'chai'
import { runCli } from '../../runCli'
import { createBubblegumTree, createCompressedNFT, stripAnsi } from './bghelpers'
import { createBubblegumCollection } from './bgcollectionhelpers'

describe('bg command integration tests', () => {

    before(async () => {
        // Airdrop SOL to test account
        await runCli([
            "toolbox", "sol", "airdrop", "100", "TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx"
        ])

        await new Promise(resolve => setTimeout(resolve, 10000))
    })

    it('creates a complete workflow: tree -> collection -> compressed NFT', async () => {
        // Step 1: Create a tree
        const { treeAddress } = await createBubblegumTree({
            maxDepth: 14,
            maxBufferSize: 64,
            canopyDepth: 8,
            name: `workflow-tree-${Date.now()}`,
        })

        expect(treeAddress).to.match(/^[a-zA-Z0-9]{32,44}$/)
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Step 2: Create a Bubblegum collection
        const { collectionId } = await createBubblegumCollection()
        expect(collectionId).to.match(/^[a-zA-Z0-9]+$/)
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Step 3: Create compressed NFT in the collection
        const { signature } = await createCompressedNFT({
            tree: treeAddress,
            name: 'Workflow NFT',
            uri: 'https://example.com/workflow.json',
            collection: collectionId,
            royalties: 5,
            symbol: 'WF',
        })

        expect(signature).to.match(/^[a-zA-Z0-9]{32,}$/)
    })

    it('creates multiple trees with different configurations', async () => {
        const smallTree = await createBubblegumTree({
            maxDepth: 14,
            maxBufferSize: 64,
            canopyDepth: 8,
            name: `small-tree-${Date.now()}`,
        })

        await new Promise(resolve => setTimeout(resolve, 2000))

        const mediumTree = await createBubblegumTree({
            maxDepth: 16,
            maxBufferSize: 64,
            canopyDepth: 10,
            name: `medium-tree-${Date.now()}`,
        })

        expect(smallTree.treeAddress).to.match(/^[a-zA-Z0-9]{32,44}$/)
        expect(mediumTree.treeAddress).to.match(/^[a-zA-Z0-9]{32,44}$/)
        expect(smallTree.treeAddress).to.not.equal(mediumTree.treeAddress)
    })

    it('creates NFTs in different trees', async () => {
        const tree1 = await createBubblegumTree({
            maxDepth: 14,
            maxBufferSize: 64,
            canopyDepth: 8,
        })

        const tree2 = await createBubblegumTree({
            maxDepth: 14,
            maxBufferSize: 64,
            canopyDepth: 8,
        })

        await new Promise(resolve => setTimeout(resolve, 2000))

        const nft1 = await createCompressedNFT({
            tree: tree1.treeAddress,
            name: 'NFT Tree 1',
            uri: 'https://example.com/tree1.json',
        })

        const nft2 = await createCompressedNFT({
            tree: tree2.treeAddress,
            name: 'NFT Tree 2',
            uri: 'https://example.com/tree2.json',
        })

        expect(nft1.signature).to.match(/^[a-zA-Z0-9]{32,}$/)
        expect(nft2.signature).to.match(/^[a-zA-Z0-9]{32,}$/)
        expect(nft1.signature).to.not.equal(nft2.signature)
    })

    it('handles public tree creation and NFT minting', async () => {
        const { treeAddress } = await createBubblegumTree({
            maxDepth: 14,
            maxBufferSize: 64,
            canopyDepth: 8,
            public: true,
        })

        await new Promise(resolve => setTimeout(resolve, 2000))

        // Anyone should be able to mint to a public tree
        const { signature } = await createCompressedNFT({
            tree: treeAddress,
            name: 'Public Tree NFT',
            uri: 'https://example.com/public.json',
        })

        expect(signature).to.match(/^[a-zA-Z0-9]{32,}$/)
    })

    it('creates a collection with multiple compressed NFTs', async () => {
        const { treeAddress } = await createBubblegumTree({
            maxDepth: 14,
            maxBufferSize: 64,
            canopyDepth: 8,
        })

        const { collectionId } = await createBubblegumCollection()

        await new Promise(resolve => setTimeout(resolve, 2000))

        // Create multiple NFTs in the same collection
        const nfts = []
        for (let i = 0; i < 3; i++) {
            const nft = await createCompressedNFT({
                tree: treeAddress,
                name: `Collection NFT ${i + 1}`,
                uri: `https://example.com/collection-${i}.json`,
                collection: collectionId,
            })
            nfts.push(nft)
            await new Promise(resolve => setTimeout(resolve, 1000))
        }

        // Verify all NFTs were created
        expect(nfts).to.have.length(3)
        nfts.forEach(nft => {
            expect(nft.signature).to.match(/^[a-zA-Z0-9]{32,}$/)
        })

        // Verify all have different signatures
        const signatures = nfts.map(n => n.signature)
        const uniqueSignatures = new Set(signatures)
        expect(uniqueSignatures.size).to.equal(3)
    })

    it('validates tree storage and naming', async () => {
        const treeName = `named-tree-${Date.now()}`

        const { treeAddress } = await createBubblegumTree({
            maxDepth: 14,
            maxBufferSize: 64,
            canopyDepth: 8,
            name: treeName,
        })

        expect(treeAddress).to.match(/^[a-zA-Z0-9]{32,44}$/)

        // The tree should be saved with this name
        // Note: We can't query the storage directly in tests, but the creation should succeed
    })

    it('handles royalties at various percentages', async () => {
        const { treeAddress } = await createBubblegumTree({
            maxDepth: 14,
            maxBufferSize: 64,
            canopyDepth: 8,
        })

        await new Promise(resolve => setTimeout(resolve, 2000))

        const royaltyTests = [0, 5, 10, 50, 100]

        for (const royalty of royaltyTests) {
            const { signature } = await createCompressedNFT({
                tree: treeAddress,
                name: `Royalty ${royalty}% NFT`,
                uri: `https://example.com/royalty-${royalty}.json`,
                royalties: royalty,
            })

            expect(signature).to.match(/^[a-zA-Z0-9]{32,}$/)
            await new Promise(resolve => setTimeout(resolve, 1000))
        }
    })

    it('creates NFTs with various symbols', async () => {
        const { treeAddress } = await createBubblegumTree({
            maxDepth: 14,
            maxBufferSize: 64,
            canopyDepth: 8,
        })

        await new Promise(resolve => setTimeout(resolve, 2000))

        const symbols = ['TEST', 'NFT', 'COMP', 'BG', '']

        for (const symbol of symbols) {
            const { signature } = await createCompressedNFT({
                tree: treeAddress,
                name: `Symbol ${symbol} NFT`,
                uri: `https://example.com/symbol-${symbol || 'empty'}.json`,
                symbol: symbol,
            })

            expect(signature).to.match(/^[a-zA-Z0-9]{32,}$/)
            await new Promise(resolve => setTimeout(resolve, 1000))
        }
    })
})
