import { expect } from 'chai'
import { runCli } from '../../runCli'
import { stripAnsi, createRegularNft, createProgrammableNft } from './tmhelpers'

describe('tm update command', () => {
    before(async () => {
        // Airdrop SOL to test wallet
        await runCli(['toolbox', 'sol', 'airdrop', '100', 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx'])
        await new Promise(resolve => setTimeout(resolve, 10000))
    })

    describe('validation', () => {
        it('should error when no update flags are provided', async () => {
            const cliInput = [
                'tm',
                'update',
                'SomeValidMintAddress123456789',
            ]

            try {
                await runCli(cliInput)
                expect.fail('Should have thrown an error')
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error)
                // Should fail with non-zero exit code and mention updating
                expect(errorMessage).to.match(/Process failed with code \d+/)
                expect(errorMessage.toLowerCase()).to.match(/nothing|update|flag/)
            }
        })

        it('should error when no mint address is provided', async () => {
            const cliInput = [
                'tm',
                'update',
                '--name',
                'New Name',
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

    describe('flag validation', () => {
        it('should error when --editor is used with other flags', async () => {
            const cliInput = [
                'tm',
                'update',
                'SomeValidMintAddress123456789',
                '--editor',
                '--name',
                'New Name',
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

        it('should error when --uri is used with --image', async () => {
            const cliInput = [
                'tm',
                'update',
                'SomeValidMintAddress123456789',
                '--uri',
                'https://example.com/metadata.json',
                '--image',
                './test.png',
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

    it.skip('updates NFT name', async () => {
        // Create a test NFT
        const { mintAddress } = await createRegularNft()

        const cliInput = [
            'tm',
            'update',
            mintAddress,
            '--name',
            'Updated Test Name',
        ]

        const { stderr, code } = await runCli(cliInput)
        const cleanStderr = stripAnsi(stderr)

        expect(code).to.equal(0)
        expect(cleanStderr).to.contain('NFT updated successfully')
        expect(cleanStderr).to.contain('Fetching existing metadata')
    })

    it.skip('updates NFT with multiple fields', async () => {
        // Create a test NFT
        const { mintAddress } = await createRegularNft()

        const cliInput = [
            'tm',
            'update',
            mintAddress,
            '--name',
            'Updated Name',
            '--symbol',
            'UPDT',
            '--description',
            'Updated description',
        ]

        const { stderr, code } = await runCli(cliInput)
        const cleanStderr = stripAnsi(stderr)

        expect(code).to.equal(0)
        expect(cleanStderr).to.contain('NFT updated successfully')
        expect(cleanStderr).to.contain('Fetching existing metadata')
        expect(cleanStderr).to.contain('Uploaded JSON')
    })

    it.skip('updates pNFT', async () => {
        // Create a test pNFT
        const { mintAddress } = await createProgrammableNft()

        const cliInput = [
            'tm',
            'update',
            mintAddress,
            '--name',
            'Updated pNFT Name',
        ]

        const { stderr, code } = await runCli(cliInput)
        const cleanStderr = stripAnsi(stderr)

        expect(code).to.equal(0)
        expect(cleanStderr).to.contain('Detected Programmable NFT')
        expect(cleanStderr).to.contain('NFT updated successfully')
    })
})
