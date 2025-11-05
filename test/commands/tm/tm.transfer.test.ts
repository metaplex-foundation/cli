import { expect } from 'chai'
import { runCli } from '../../runCli'
import { stripAnsi, createRegularNft, createProgrammableNft } from './tmhelpers'

describe('tm transfer command', () => {
    before(async () => {
        // Airdrop SOL to test wallet
        await runCli(['toolbox', 'sol', 'airdrop', '100', 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx'])
        await new Promise(resolve => setTimeout(resolve, 10000))
    })

    describe('validation', () => {
        it('should error when mint address is missing', async () => {
            const cliInput = [
                'tm',
                'transfer',
            ]

            try {
                await runCli(cliInput)
                expect.fail('Should have thrown an error')
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error)
                // Should fail with non-zero exit code
                expect(errorMessage).to.match(/Process failed with code \d+/)
            }
        })

        it('should error when destination address is missing', async () => {
            const cliInput = [
                'tm',
                'transfer',
                'SomeValidMintAddress123456789',
            ]

            try {
                await runCli(cliInput)
                expect.fail('Should have thrown an error')
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error)
                // Should fail with non-zero exit code
                expect(errorMessage).to.match(/Process failed with code \d+/)
            }
        })
    })

    it('transfers a regular NFT', async () => {
        // Create a test NFT
        const { mintAddress } = await createRegularNft()

        // Use a different wallet address as destination (the test wallet itself)
        const destination = 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx'

        const cliInput = [
            'tm',
            'transfer',
            mintAddress,
            destination,
        ]

        const { stderr, code } = await runCli(cliInput)
        const cleanStderr = stripAnsi(stderr)

        expect(code).to.equal(0)
        expect(cleanStderr).to.contain('NFT transferred successfully')
        expect(cleanStderr).to.contain('NFT data fetched')
    })

    it('transfers a pNFT', async () => {
        // Create a test pNFT
        const { mintAddress } = await createProgrammableNft()

        // Use a different wallet address as destination
        const destination = 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx'

        const cliInput = [
            'tm',
            'transfer',
            mintAddress,
            destination,
        ]

        const { stderr, code } = await runCli(cliInput)
        const cleanStderr = stripAnsi(stderr)

        expect(code).to.equal(0)
        expect(cleanStderr).to.contain('NFT transferred successfully')
    })
})
