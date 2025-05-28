import { expect } from 'chai'
import { runCli } from '../../runCli'
import { createCoreAsset, createCoreCollection, stripAnsi } from './corehelpers'


describe('core asset burn commands', () => {
    before(async () => {
        const { stdout, stderr, code } = await runCli(
            ["toolbox", 'sol', "airdrop", "100"]
        )
        // console.log('Airdrop stdout:', stdout)
        // console.log('Airdrop stderr:', stderr)
        // console.log('Airdrop code:', code)
        await new Promise(resolve => setTimeout(resolve, 10000))
    })

    it('can burn an asset via Asset ID', async () => {

        const { assetId } = await createCoreAsset()

        // Now burn the asset
        const burnInput = [
            'core',
            'asset',
            'burn',
            assetId
        ]

        const { stdout: burnStdout, stderr: burnStderr, code: burnCode } = await runCli(
            burnInput
        )

        // console.log('Burn test completed')
        // console.log('Burn stdout:', burnStdout)
        // console.log('Burn stderr:', burnStderr)
        // console.log('Burn code:', burnCode)

        const cleanBurnStderr = stripAnsi(burnStderr)
        expect(burnCode).to.equal(0)
        expect(cleanBurnStderr).to.contain('Asset burned:')
        expect(cleanBurnStderr).to.contain(assetId)
    })

    it('can burn an asset in a collection', async () => {
        const { collectionId } = await createCoreCollection()
        const { assetId } = await createCoreAsset(collectionId)

        const burnInput = [
            'core',
            'asset',
            'burn',
            assetId
        ]

        const { stdout: burnStdout, stderr: burnStderr, code: burnCode } = await runCli(
            burnInput
        )

        const cleanBurnStderr = stripAnsi(burnStderr)
        expect(burnCode).to.equal(0)
        expect(cleanBurnStderr).to.contain('Asset burned:')
        expect(cleanBurnStderr).to.contain(assetId)
    })
})