import { expect } from 'chai'
import { runCli } from '../../runCli'
import { createBubblegumTree, createCompressedNFT, stripAnsi, extractSignature } from './bghelpers'
import { generateSigner } from '@metaplex-foundation/umi'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'

/**
 * SKIPPED: bg nft transfer command tests
 *
 * These tests are skipped because the transfer command requires fetching asset and proof data
 * using getAssetWithProof, which depends on the Digital Asset Standard (DAS) API.
 * DAS is not available in local testing environments.
 *
 * To test transfer functionality:
 * - Deploy to devnet/mainnet with DAS available
 * - Use a test environment with DAS API access
 * - Mock the getAssetWithProof calls
 */
describe.skip('bg nft transfer command', () => {
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

    it('transfers a compressed NFT to a new owner', async () => {
        // Create an NFT first
        const { assetId } = await createCompressedNFT({
            tree: testTree,
            name: 'Transfer Test NFT',
            uri: 'https://example.com/transfer-test.json',
        })

        // Skip if we don't have asset ID (can't fetch without DAS)
        if (!assetId) {
            console.log('Skipping transfer test - asset ID not available without DAS')
            return
        }

        // Generate a new owner address
        const umi = createUmi('http://127.0.0.1:8899')
        const newOwner = generateSigner(umi)

        await new Promise(resolve => setTimeout(resolve, 2000))

        // Transfer the NFT
        const cliInput = [
            'bg',
            'nft',
            'transfer',
            assetId,
            newOwner.publicKey.toString(),
        ]

        const { stdout, stderr, code } = await runCli(cliInput)
        const combined = stripAnsi(stdout + '\n' + stderr)

        expect(code).to.equal(0)
        expect(combined).to.contain('Compressed NFT transferred')

        const signature = extractSignature(combined)
        expect(signature).to.match(/^[a-zA-Z0-9]{32,}$/)
    })

    it('includes transfer details in output', async () => {
        const { assetId } = await createCompressedNFT({
            tree: testTree,
            name: 'Transfer Details NFT',
            uri: 'https://example.com/transfer-details.json',
        })

        if (!assetId) {
            console.log('Skipping transfer details test - asset ID not available')
            return
        }

        const umi = createUmi('http://127.0.0.1:8899')
        const newOwner = generateSigner(umi)

        await new Promise(resolve => setTimeout(resolve, 2000))

        const cliInput = [
            'bg',
            'nft',
            'transfer',
            assetId,
            newOwner.publicKey.toString(),
        ]

        const { stdout, stderr, code } = await runCli(cliInput)
        const combined = stripAnsi(stdout + '\n' + stderr)

        expect(code).to.equal(0)
        expect(combined).to.match(/From:/)
        expect(combined).to.match(/To:/)
        expect(combined).to.match(/Signature:/)
        expect(combined).to.match(/Explorer:.*http/)
    })

    it('validates owner/delegate permissions', async () => {
        const { assetId } = await createCompressedNFT({
            tree: testTree,
            name: 'Permission Test NFT',
            uri: 'https://example.com/permission-test.json',
        })

        if (!assetId) {
            console.log('Skipping permission test - asset ID not available')
            return
        }

        const umi = createUmi('http://127.0.0.1:8899')
        const newOwner = generateSigner(umi)

        await new Promise(resolve => setTimeout(resolve, 2000))

        // This should succeed because test keypair is the owner
        const cliInput = [
            'bg',
            'nft',
            'transfer',
            assetId,
            newOwner.publicKey.toString(),
        ]

        const { code } = await runCli(cliInput)
        expect(code).to.equal(0)
    })
})
