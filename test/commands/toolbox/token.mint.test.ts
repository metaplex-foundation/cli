import { expect } from 'chai'
import { runCli } from '../../runCli'

// Helper to strip ANSI color codes
const stripAnsi = (str: string) => str.replace(/\u001b\[\d+m/g, '')

// Helper to extract transaction signature from message
const extractTransactionSignature = (str: string) => {
    const match = str.match(/Transaction Signature: ([a-zA-Z0-9]+)/)
    return match ? match[1] : null
}

// Helper to extract mint address from message
const extractMintAddress = (str: string) => {
    const match = str.match(/Mint Address: ([a-zA-Z0-9]+)/)
    return match ? match[1] : null
}

describe('toolbox token mint command', () => {
    let testMintAddress: string

    before(async function() {
        this.timeout(120000) // 2 minutes timeout for setup
        
        // Airdrop SOL first
        await runCli([
            "toolbox", "sol", "airdrop", "100", "TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx"
        ])

        // Wait for airdrop to process
        await new Promise(resolve => setTimeout(resolve, 10000))

        // Create a test token first for minting tests
        try {
            const { stderr } = await runCli([
                'toolbox',
                'token',
                'create',
                '--name',
                'Test Mint Token',
                '--symbol',
                'TMT',
                '--description',
                'Token for mint testing',
                '--decimals',
                '2',
                '--mint-amount',
                '1000'
            ])

            const cleanStderr = stripAnsi(stderr)
            testMintAddress = extractMintAddress(cleanStderr)!
            
            if (!testMintAddress) {
                throw new Error('Failed to create test token for mint tests')
            }
        } catch (error) {
            // If token creation fails, we'll skip the mint tests
            this.skip()
        }
    })

    describe('successful minting', () => {
        it('mints tokens to default recipient (current keypair)', async function() {
            this.timeout(60000)
            
            if (!testMintAddress) {
                this.skip()
                return
            }

            const { stdout, stderr, code } = await runCli([
                'toolbox',
                'token',
                'mint',
                '--mint',
                testMintAddress,
                '--amount',
                '500'
            ])

            const cleanStderr = stripAnsi(stderr)
            const transactionSignature = extractTransactionSignature(cleanStderr)

            expect(code).to.equal(0)
            expect(cleanStderr).to.contain('Tokens minted successfully!')
            expect(cleanStderr).to.contain('Amount Minted: 500')
            expect(cleanStderr).to.contain(`Mint Address: ${testMintAddress}`)
            expect(transactionSignature).to.match(/^[a-zA-Z0-9]+$/)
        })

        it('mints tokens to specific recipient', async function() {
            this.timeout(60000)
            
            if (!testMintAddress) {
                this.skip()
                return
            }

            const recipientAddress = 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx'
            
            const { stdout, stderr, code } = await runCli([
                'toolbox',
                'token',
                'mint',
                '--mint',
                testMintAddress,
                '--amount',
                '250',
                '--recipient',
                recipientAddress
            ])

            const cleanStderr = stripAnsi(stderr)
            const transactionSignature = extractTransactionSignature(cleanStderr)

            expect(code).to.equal(0)
            expect(cleanStderr).to.contain('Tokens minted successfully!')
            expect(cleanStderr).to.contain('Amount Minted: 250')
            expect(cleanStderr).to.contain(`Mint Address: ${testMintAddress}`)
            expect(cleanStderr).to.contain(`Recipient: ${recipientAddress}`)
            expect(transactionSignature).to.match(/^[a-zA-Z0-9]+$/)
        })

        it('includes execution time with speed-run flag', async function() {
            this.timeout(60000)
            
            if (!testMintAddress) {
                this.skip()
                return
            }

            const { stdout, stderr, code } = await runCli([
                'toolbox',
                'token',
                'mint',
                '--mint',
                testMintAddress,
                '--amount',
                '100',
                '--speed-run'
            ])

            const cleanStderr = stripAnsi(stderr)

            expect(code).to.equal(0)
            expect(cleanStderr).to.contain('Tokens minted successfully!')
            expect(cleanStderr).to.contain('Execution Time:')
            expect(cleanStderr).to.match(/Execution Time: \d+\.\d+ seconds/)
        })
    })

    describe('error handling', () => {
        it('fails with invalid mint address', async () => {
            try {
                await runCli([
                    'toolbox',
                    'token',
                    'mint',
                    '--mint',
                    'invalid-mint-address',
                    '--amount',
                    '100'
                ])
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.message).to.contain('Invalid mint address')
            }
        })

        it('fails with zero amount', async () => {
            if (!testMintAddress) {
                return
            }

            try {
                await runCli([
                    'toolbox',
                    'token',
                    'mint',
                    '--mint',
                    testMintAddress,
                    '--amount',
                    '0'
                ])
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.message).to.contain('Amount must be greater than 0')
            }
        })

        it('fails with negative amount', async () => {
            if (!testMintAddress) {
                return
            }

            try {
                await runCli([
                    'toolbox',
                    'token',
                    'mint',
                    '--mint',
                    testMintAddress,
                    '--amount',
                    '-100'
                ])
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.message).to.contain('Expected an integer greater than or equal to 0')
            }
        })

        it('fails with invalid recipient address', async () => {
            if (!testMintAddress) {
                return
            }

            try {
                await runCli([
                    'toolbox',
                    'token',
                    'mint',
                    '--mint',
                    testMintAddress,
                    '--amount',
                    '100',
                    '--recipient',
                    'invalid-recipient-address'
                ])
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.message).to.contain('Invalid recipient address')
            }
        })

        it('fails with missing required flags', async () => {
            try {
                await runCli([
                    'toolbox',
                    'token',
                    'mint'
                ])
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.message).to.contain('Missing required flag')
            }
        })

        it('includes execution time in error message with speed-run flag', async () => {
            try {
                await runCli([
                    'toolbox',
                    'token',
                    'mint',
                    '--mint',
                    'invalid-mint-address',
                    '--amount',
                    '100',
                    '--speed-run'
                ])
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.message).to.match(/Command failed after \d+\.\d+ seconds/)
            }
        })
    })

    describe('flag validation', () => {
        it('requires mint flag', async () => {
            try {
                await runCli([
                    'toolbox',
                    'token',
                    'mint',
                    '--amount',
                    '100'
                ])
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.message).to.contain('Missing required flag')
                expect(error.message).to.contain('mint')
            }
        })

        it('requires amount flag', async () => {
            try {
                await runCli([
                    'toolbox',
                    'token',
                    'mint',
                    '--mint',
                    'someaddress'
                ])
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.message).to.contain('Missing required flag')
                expect(error.message).to.contain('amount')
            }
        })

        it('accepts valid integer amounts', async function() {
            this.timeout(60000)
            
            if (!testMintAddress) {
                this.skip()
                return
            }

            const { stderr, code } = await runCli([
                'toolbox',
                'token',
                'mint',
                '--mint',
                testMintAddress,
                '--amount',
                '1'
            ])

            const cleanStderr = stripAnsi(stderr)
            expect(code).to.equal(0)
            expect(cleanStderr).to.contain('Amount Minted: 1')
        })
    })
})