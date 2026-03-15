import { expect } from 'chai'
import { runCli } from '../../runCli'
import { createCoreAsset, createCoreCollection, stripAnsi } from './corehelpers'

const TEST_RECIPIENT = 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx'

describe('core asset transfer commands', () => {
    before(async () => {
        await runCli(['toolbox', 'sol', 'airdrop', '100', TEST_RECIPIENT])
        await new Promise(resolve => setTimeout(resolve, 10000))
    })

    it('can transfer an asset without a collection', async function () {
        this.timeout(60000)

        const { assetId } = await createCoreAsset()

        const { stdout, stderr, code } = await runCli([
            'core', 'asset', 'transfer', assetId, TEST_RECIPIENT
        ])

        const cleanStderr = stripAnsi(stderr)
        const cleanStdout = stripAnsi(stdout)
        expect(code).to.equal(0)
        expect(cleanStderr).to.contain('Asset transferred:')
        expect(cleanStderr).to.contain(assetId)
        expect(cleanStdout).to.contain(TEST_RECIPIENT)
    })

    it('can transfer an asset that is part of a collection', async function () {
        this.timeout(60000)

        const { collectionId } = await createCoreCollection()
        const { assetId } = await createCoreAsset(collectionId)

        const { stdout, stderr, code } = await runCli([
            'core', 'asset', 'transfer', assetId, TEST_RECIPIENT
        ])

        const cleanStderr = stripAnsi(stderr)
        const cleanStdout = stripAnsi(stdout)
        expect(code).to.equal(0)
        expect(cleanStderr).to.contain('Asset transferred:')
        expect(cleanStderr).to.contain(assetId)
        expect(cleanStdout).to.contain(TEST_RECIPIENT)
    })

    it('fails when the signer is not the asset owner', async function () {
        this.timeout(90000)

        const { assetId } = await createCoreAsset()

        // Transfer the asset away so the test wallet is no longer the owner
        await runCli(['core', 'asset', 'transfer', assetId, TEST_RECIPIENT])

        // Try to transfer again — should fail as we no longer own it
        try {
            await runCli(['core', 'asset', 'transfer', assetId, TEST_RECIPIENT])
            expect.fail('Expected transfer to fail when signer is not the owner')
        } catch (error: any) {
            expect(error.message).to.contain('not the owner')
        }
    })
})
