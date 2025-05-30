import { expect } from 'chai'
import { runCli } from '../../runCli'
import { createCoreCollection } from './corehelpers'


// Helper to strip ANSI color codes
const stripAnsi = (str: string) => str.replace(/\u001b\[\d+m/g, '')

// Helper to extract collection ID from message
const extractCollectionId = (str: string) => {
    const match = str.match(/Collection: ([a-zA-Z0-9]+)/)
    return match ? match[1] : null
}

describe('core collection commands', () => {

    before(async () => {
        const { stdout, stderr, code } = await runCli(
            ["toolbox", "sol", "airdrop", "100", "TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx"]
        )
        // console.log('Airdrop stdout:', stdout)
        // console.log('Airdrop stderr:', stderr)
        // console.log('Airdrop code:', code)

        await new Promise(resolve => setTimeout(resolve, 10000))
    })


    it('creates a new collection with `name` and `uri` flags and skips plugin selection', async () => {

        const { collectionId } = await createCoreCollection({})

        expect(collectionId).to.match(/^[a-zA-Z0-9]+$/)
    })

    // Skipping for now because you can't upload files on localnet
    it.skip('creates a new collection with --files flag while uploading --image and --json files', async () => {

        //make sure to upload files under 100b to get free uploads for testing.

        const cliInput = [
            'core',
            'collection',
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
        const collectionId = extractCollectionId(cleanStderr)

        expect(code).to.equal(0)
        expect(cleanStderr).to.contain('Collection created successfully')
        expect(collectionId).to.match(/^[a-zA-Z0-9]+$/)
    })
})

