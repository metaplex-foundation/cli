import { expect } from 'chai'
import { runCli } from '../../runCli'
import { createCoreAsset, createCoreCollection, stripAnsi } from './corehelpers'

const ASSET_SIGNER_PDA_PATTERN = /Signer PDA:\s+([a-zA-Z0-9]+)/

const extractSignerPda = (str: string) => {
    const match = str.match(ASSET_SIGNER_PDA_PATTERN)
    return match ? match[1] : null
}

describe('core asset execute commands', function () {
    this.timeout(120000)

    describe('info', () => {
        it('shows the asset signer PDA address and balance', async function () {
            const { assetId } = await createCoreAsset()

            const { stdout, stderr, code } = await runCli([
                'core', 'asset', 'execute', 'info', assetId
            ])

            const cleanStderr = stripAnsi(stderr)
            const cleanStdout = stripAnsi(stdout)
            const output = cleanStdout + cleanStderr

            expect(code).to.equal(0)
            expect(output).to.contain('Signer PDA:')
            expect(output).to.contain('SOL Balance:')

            const signerPda = extractSignerPda(output)
            expect(signerPda).to.match(/^[a-zA-Z0-9]+$/)
        })

        it('shows the signer PDA for an asset in a collection', async function () {
            const { collectionId } = await createCoreCollection()
            const { assetId } = await createCoreAsset(collectionId)

            const { stdout, stderr, code } = await runCli([
                'core', 'asset', 'execute', 'info', assetId
            ])

            const output = stripAnsi(stdout) + stripAnsi(stderr)
            expect(code).to.equal(0)
            expect(output).to.contain('Signer PDA:')
        })
    })
})
