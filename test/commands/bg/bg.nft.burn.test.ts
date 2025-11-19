import { expect } from 'chai'
import { runCli } from '../../runCli'
import { createBubblegumTree, createCompressedNFT, stripAnsi, extractSignature } from './bghelpers'

/**
 * SKIPPED: bg nft burn command tests
 *
 * These tests are skipped because the burn command requires fetching asset and proof data
 * using getAssetWithProof, which depends on the Digital Asset Standard (DAS) API.
 * DAS is not available in local testing environments.
 *
 * To test burn functionality:
 * - Deploy to devnet/mainnet with DAS available
 * - Use a test environment with DAS API access
 * - Mock the getAssetWithProof calls
 */
describe.skip('bg nft burn command', () => {
    let testTree: string

    before(async () => {
        // Airdrop SOL to test account
        await runCli([
            "toolbox", "sol", "airdrop", "100", "TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx"
        ])

        await new Promise(resolve => setTimeout(resolve, 10000))

        // Create a test tree
        const { treeAddress } = await createBubblegumTree({
            maxDepth: 14,
            maxBufferSize: 64,
            canopyDepth: 8,
        })
        testTree = treeAddress

        await new Promise(resolve => setTimeout(resolve, 2000))
    })

    it('burns a compressed NFT', async () => {
        // Create an NFT first
        const { assetId } = await createCompressedNFT({
            tree: testTree,
            name: 'Burn Test NFT',
            uri: 'https://example.com/burn-test.json',
        })

        // Skip if we don't have asset ID (can't fetch without DAS)
        if (!assetId) {
            console.log('Skipping burn test - asset ID not available without DAS')
            return
        }

        await new Promise(resolve => setTimeout(resolve, 2000))

        // Burn the NFT
        const cliInput = [
            'bg',
            'nft',
            'burn',
            assetId,
        ]

        const { stdout, stderr, code } = await runCli(cliInput)
        const combined = stripAnsi(stdout + '\n' + stderr)

        expect(code).to.equal(0)
        expect(combined).to.contain('Compressed NFT burned')

        const signature = extractSignature(combined)
        expect(signature).to.match(/^[a-zA-Z0-9]{32,}$/)
    })

    it('includes burn details in output', async () => {
        const { assetId } = await createCompressedNFT({
            tree: testTree,
            name: 'Burn Details NFT',
            uri: 'https://example.com/burn-details.json',
        })

        if (!assetId) {
            console.log('Skipping burn details test - asset ID not available')
            return
        }

        await new Promise(resolve => setTimeout(resolve, 2000))

        const cliInput = [
            'bg',
            'nft',
            'burn',
            assetId,
        ]

        const { stdout, stderr, code } = await runCli(cliInput)
        const combined = stripAnsi(stdout + '\n' + stderr)

        expect(code).to.equal(0)
        expect(combined).to.match(/Asset ID:/)
        expect(combined).to.match(/Owner:/)
        expect(combined).to.match(/Tree:/)
        expect(combined).to.match(/Signature:/)
        expect(combined).to.match(/Explorer:.*http/)
    })

    it('validates owner/delegate permissions for burning', async () => {
        const { assetId } = await createCompressedNFT({
            tree: testTree,
            name: 'Burn Permission Test NFT',
            uri: 'https://example.com/burn-permission.json',
        })

        if (!assetId) {
            console.log('Skipping burn permission test - asset ID not available')
            return
        }

        await new Promise(resolve => setTimeout(resolve, 2000))

        // This should succeed because test keypair is the owner
        const cliInput = [
            'bg',
            'nft',
            'burn',
            assetId,
        ]

        const { code } = await runCli(cliInput)
        expect(code).to.equal(0)
    })

    it('burns multiple NFTs sequentially', async () => {
        // Create multiple NFTs
        const nft1 = await createCompressedNFT({
            tree: testTree,
            name: 'Multi Burn 1',
            uri: 'https://example.com/multi-burn-1.json',
        })

        const nft2 = await createCompressedNFT({
            tree: testTree,
            name: 'Multi Burn 2',
            uri: 'https://example.com/multi-burn-2.json',
        })

        if (!nft1.assetId || !nft2.assetId) {
            console.log('Skipping multi-burn test - asset IDs not available')
            return
        }

        await new Promise(resolve => setTimeout(resolve, 2000))

        // Burn first NFT
        const burn1 = await runCli(['bg', 'nft', 'burn', nft1.assetId])
        expect(burn1.code).to.equal(0)

        await new Promise(resolve => setTimeout(resolve, 2000))

        // Burn second NFT
        const burn2 = await runCli(['bg', 'nft', 'burn', nft2.assetId])
        expect(burn2.code).to.equal(0)

        // Verify different signatures
        const sig1 = extractSignature(stripAnsi(burn1.stdout + '\n' + burn1.stderr))
        const sig2 = extractSignature(stripAnsi(burn2.stdout + '\n' + burn2.stderr))

        expect(sig1).to.not.equal(sig2)
    })
})
