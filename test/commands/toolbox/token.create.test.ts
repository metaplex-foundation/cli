import { expect } from 'chai'
import { runCli } from '../../runCli'

// Helper to strip ANSI color codes
const stripAnsi = (str: string) => str.replace(/\u001b\[\d+m/g, '')

// Helper to extract mint address from message
const extractMintAddress = (str: string) => {
    const match = str.match(/Mint Address: ([a-zA-Z0-9]+)/)
    return match ? match[1] : null
}

describe('toolbox token commands', () => {
    before(async () => {
        const { stdout, stderr, code } = await runCli(
            ["toolbox", "sol", "airdrop", "100", "TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx"]
        )

        await new Promise(resolve => setTimeout(resolve, 10000))
    })


    // Skipping this test for now due to command trying to upload jsons to storage.
    // Manuel test command:
    // mplx toolbox token create --name "Test Token" --symbol "TEST" --description "Test token description" --decimals 2 --mint-amount 1000000

    it.skip('creates a new token with direct flags', async () => {
        const cliInput = [
            'toolbox',
            'token',
            'create',
            '--name',
            'Test Token',
            '--symbol',
            'TEST',
            '--description',
            'Test token description',
            '--decimals',
            '2',
            '--mint-amount',
            '1000000'
        ]

        const { stdout, stderr, code } = await runCli(cliInput)

        const cleanStderr = stripAnsi(stderr)
        const mintAddress = extractMintAddress(cleanStderr)

        expect(code).to.equal(0)
        expect(cleanStderr).to.contain('Token created successfully')
        expect(mintAddress).to.match(/^[a-zA-Z0-9]+$/)
    })

    // Skipping this test for now due to command trying to upload jsons to storage.
    it.skip('creates a new token with wizard mode', async () => {
        const cliInput = [
            'toolbox',
            'token',
            'create',
            '--wizard'
        ]

        // Simulate wizard inputs
        const cliStdin = [
            'Test Token',      // name
            'TEST',           // symbol
            'Test description', // description
            'n',               // skip image
            '2',              // decimals
            '1000000'         // mint amount
        ]

        const { stdout, stderr, code } = await runCli(cliInput, cliStdin)

        const cleanStderr = stripAnsi(stderr)
        const mintAddress = extractMintAddress(cleanStderr)

        expect(code).to.equal(0)
        expect(cleanStderr).to.contain('Token created successfully')
        expect(mintAddress).to.match(/^[a-zA-Z0-9]+$/)
    })
}) 