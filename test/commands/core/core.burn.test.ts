import { expect } from 'chai'
import { runCli } from '../../runCli'
import { extractAssetId } from '../../utils'


// Helper to strip ANSI color codes
const stripAnsi = (str: string) => str.replace(/\u001b\[\d+m/g, '')

describe('core asset burn commands', () => {

    before(async () => {
        const { stdout, stderr, code } = await runCli(
            ["toolbox", "airdrop", "100"]
        )
        // console.log('Airdrop stdout:', stdout)
        // console.log('Airdrop stderr:', stderr)
        // console.log('Airdrop code:', code)
    })


    it('can burn an asset via Asset ID', async () => {

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
        expect(code).to.equal(0)
        expect(cleanStderr).to.contain('Asset created with ID:')

        const assetId = extractAssetId(cleanStderr)

        // console.log('--------------------------------')
        // console.log('Asset ID:', assetId)
        // console.log('--------------------------------')

        const { stdout: burnStdout, stderr: burnStderr, code: burnCode } = await runCli(
            ["core", "asset", "burn", assetId!]
        )

        // console.log('Burn stdout:', burnStdout)
        // console.log('Burn stderr:', burnStderr)
        // console.log('Burn code:', burnCode)

        const cleanBurnStderr = stripAnsi(burnStderr)
        expect(burnCode).to.equal(0)
        expect(cleanBurnStderr).to.contain('Asset burned')
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