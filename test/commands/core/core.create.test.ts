import { expect } from 'chai'
import { runCli } from '../../runCli'
import { createCoreAsset, createCoreCollection } from './corehelpers'


// Helper to strip ANSI color codes
const stripAnsi = (str: string) => str.replace(/\u001b\[\d+m/g, '')

// Helper to extract asset ID from message
const extractAssetId = (str: string) => {
    const match = str.match(/Asset created with ID: ([a-zA-Z0-9]+)/)
    return match ? match[1] : null
}

describe('core asset commands', () => {

    before(async () => {
        const { stdout, stderr, code } = await runCli(
            ["toolbox", "sol", "airdrop", "100"]
        )
        // console.log('Airdrop stdout:', stdout)
        // console.log('Airdrop stderr:', stderr)
        // console.log('Airdrop code:', code)
    })


    it('creates a new asset with `name` and `uri` flags and skips plugin selection', async () => {

        const cliInput = [
            'core',
            'asset',
            'create',
            '--name',
            'Test Asset',
            '--uri',
            'https://example.com/test-asset'
        ]
        const cliStdin = ['\n']

        const { stdout, stderr, code } = await runCli(
            cliInput,
            cliStdin
        )

        // console.log('Test completed')
        // console.log('Final stdout:', stdout)
        // console.log('Final stderr:', stderr)
        // console.log('Exit code:', code)

        const cleanStderr = stripAnsi(stderr)
        const assetId = extractAssetId(cleanStderr)

        expect(code).to.equal(0)
        expect(cleanStderr).to.contain('Asset created successfully')
        expect(assetId).to.match(/^[a-zA-Z0-9]+$/)
    })

    it('creates a new asset with --files flag while uploading --image and --json files', async () => {

        //make sure to upload files under 100b to get free uploads for testing.

        const cliInput = [
            'core',
            'asset',
            'create',
            '--files',
            '--image',
            'test-assets/0.png',
            '--json',
            'test-assets/0.json'
        ]
        const cliStdin = ['\n']

        const { stdout, stderr, code } = await runCli(
            cliInput,
            cliStdin
        )

        // console.log('Test completed')
        // console.log('Final stdout:', stdout)
        // console.log('Final stderr:', stderr)
        // console.log('Exit code:', code)

        const cleanStderr = stripAnsi(stderr)
        const assetId = extractAssetId(cleanStderr)

        expect(code).to.equal(0)
        expect(cleanStderr).to.contain('Asset created successfully')
        expect(assetId).to.match(/^[a-zA-Z0-9]+$/)
    })

    it('creates an asset into a collection', async () => {
        const { collectionId } = await createCoreCollection()
        const { assetId } = await createCoreAsset(collectionId)

        expect(assetId).to.match(/^[a-zA-Z0-9]+$/)
    })
})

