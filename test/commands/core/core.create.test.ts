import { expect } from 'chai'
import { runCli } from '../../runCli'


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
            ["toolbox", "airdrop", "100"]
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
        expect(cleanStderr).to.contain('Asset created with ID:')
        expect(assetId).to.match(/^[a-zA-Z0-9]+$/)
    })

    it('creates a new asset with --files flag while uploading --image and --json files', async () => {

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

        console.log('Test completed')
        console.log('Final stdout:', stdout)
        console.log('Final stderr:', stderr)
        console.log('Exit code:', code)

        const cleanStderr = stripAnsi(stderr)
        const assetId = extractAssetId(cleanStderr)

        expect(code).to.equal(0)
        expect(cleanStderr).to.contain('Asset created with ID:')
        expect(assetId).to.match(/^[a-zA-Z0-9]+$/)
    })

    // // Test interactive command with prompts
    // it('creates a new asset interactively', async () => {
    //   const { stdout, stderr, code } = await runCli(['core', 'asset', 'create'])
    //   // TODO: Implement interactive test with child process stdin
    //   expect(code).to.equal(0)
    //   expect(stdout).to.contain('Asset created with ID:')
    // })

    // // Test file-based asset creation
    // it('creates a new asset with files', async () => {
    //   const { stdout, stderr, code } = await runCli([
    //     'core',
    //     'asset',
    //     'create',
    //     '--files',
    //     '--image',
    //     'test/assets/0.png',
    //     '--json',
    //     'test/assets/0.json'
    //   ])
    //   expect(code).to.equal(0)
    //   expect(stdout).to.contain('Asset created with ID:')
    // })

    // // Test error cases
    // it('shows error when required parameters are missing', async () => {
    //   const { stderr, code } = await runCli(['core', 'asset', 'create'])
    //   expect(code).to.not.equal(0)
    //   expect(stderr).to.contain('Missing required parameters')
    // })
})

