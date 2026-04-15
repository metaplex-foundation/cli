import { expect } from 'chai'
import { runCli } from '../../runCli'
import { createCoreAsset, createCoreCollection, extractAssetId, stripAnsi } from './corehelpers'

describe('core asset update --collection / --remove-collection', () => {

    before(async () => {
        await runCli(
            ["toolbox", "sol", "airdrop", "100", "TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx"]
        )
        await new Promise(resolve => setTimeout(resolve, 10000))
    })

    it('adds an asset to a collection via --collection flag', async () => {
        const { collectionId } = await createCoreCollection()
        const { assetId } = await createCoreAsset()

        const { stdout, stderr, code } = await runCli([
            'core', 'asset', 'update', assetId, '--collection', collectionId
        ])

        const cleanStderr = stripAnsi(stderr)
        expect(code).to.equal(0)
        expect(cleanStderr).to.contain('added to collection')

        // Verify the asset is now in the collection
        const { stdout: fetchStdout } = await runCli(['core', 'asset', 'fetch', assetId])
        const cleanFetch = stripAnsi(fetchStdout)
        expect(cleanFetch).to.contain(collectionId)
    })

    it('moves an asset from one collection to another', async () => {
        const { collectionId: collectionA } = await createCoreCollection()
        const { collectionId: collectionB } = await createCoreCollection()
        const { assetId } = await createCoreAsset(collectionA)

        const { stdout, stderr, code } = await runCli([
            'core', 'asset', 'update', assetId, '--collection', collectionB
        ])

        const cleanStderr = stripAnsi(stderr)
        expect(code).to.equal(0)
        expect(cleanStderr).to.contain('moved to new collection')

        // Verify the asset is now in collection B
        const { stdout: fetchStdout } = await runCli(['core', 'asset', 'fetch', assetId])
        const cleanFetch = stripAnsi(fetchStdout)
        expect(cleanFetch).to.contain(collectionB)
    })

    it('removes an asset from a collection via --remove-collection flag', async () => {
        const { collectionId } = await createCoreCollection()
        const { assetId } = await createCoreAsset(collectionId)

        const { stdout, stderr, code } = await runCli([
            'core', 'asset', 'update', assetId, '--remove-collection'
        ])

        const cleanStderr = stripAnsi(stderr)
        expect(code).to.equal(0)
        expect(cleanStderr).to.contain('removed from collection')
    })

    it('errors when using --remove-collection on an asset not in a collection', async () => {
        const { assetId } = await createCoreAsset()

        try {
            await runCli([
                'core', 'asset', 'update', assetId, '--remove-collection'
            ])
            expect.fail('Should have thrown')
        } catch (error: any) {
            const msg = error.message || ''
            expect(msg).to.satisfy((m: string) =>
                m.includes('does not belong to a collection') || m.includes('not in a collection')
            )
        }
    })

    it('collection add alias still works', async () => {
        const { collectionId } = await createCoreCollection()
        const { assetId } = await createCoreAsset()

        const { stdout, stderr, code } = await runCli([
            'core', 'collection', 'add', collectionId, assetId
        ])

        const cleanStderr = stripAnsi(stderr)
        const cleanStdout = stripAnsi(stdout)
        expect(code).to.equal(0)
        expect(cleanStderr).to.contain('Asset added to collection')

        // Verify the asset is now in the collection
        const { stdout: fetchStdout } = await runCli(['core', 'asset', 'fetch', assetId])
        const cleanFetch = stripAnsi(fetchStdout)
        expect(cleanFetch).to.contain(collectionId)
    })
})
