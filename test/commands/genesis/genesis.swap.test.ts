import { expect } from 'chai'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { runCli } from '../../runCli'
import { createGenesisAccount, createBondingCurveGenesis, stripAnsi } from './genesishelpers'

describe('genesis swap and bonding curve commands', () => {

    before(async () => {
        await runCli(['toolbox', 'sol', 'airdrop', '100', 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx'])
        await new Promise(resolve => setTimeout(resolve, 5000))
        await runCli(['toolbox', 'sol', 'wrap', '50'])
    })

    describe('genesis swap flag validation', () => {

        it('fails when genesis account is missing', async () => {
            try {
                await runCli(['genesis', 'swap'])
                expect.fail('Should have thrown an error for missing argument')
            } catch (error) {
                const msg = (error as Error).message
                expect(msg).to.satisfy(
                    (m: string) => m.includes('Missing') || m.includes('genesis') || m.includes('GENESIS'),
                    'Expected error about missing genesis argument'
                )
            }
        })

        it('fails when neither --buyAmount nor --sellAmount is provided', async () => {
            try {
                await runCli([
                    'genesis', 'swap',
                    '11111111111111111111111111111111',
                ])
                expect.fail('Should have thrown an error for missing amount')
            } catch (error) {
                const msg = (error as Error).message
                expect(msg).to.contain('--buyAmount or --sellAmount is required')
            }
        })

        it('fails when both --buyAmount and --sellAmount are provided', async () => {
            try {
                await runCli([
                    'genesis', 'swap',
                    '11111111111111111111111111111111',
                    '--buyAmount', '100000000',
                    '--sellAmount', '500000000',
                ])
                expect.fail('Should have thrown an error for both amounts')
            } catch (error) {
                const msg = (error as Error).message
                expect(msg).to.contain('Cannot specify both')
            }
        })

        it('--info mode does not require --direction or --amount', async () => {
            // Should get past flag parsing and fail on account lookup
            try {
                await runCli([
                    'genesis', 'swap',
                    '11111111111111111111111111111111',
                    '--info',
                ])
                expect.fail('Should have thrown an error for non-existent account')
            } catch (error) {
                const msg = (error as Error).message
                // Should fail at account fetch, not flag validation
                expect(msg).to.not.contain('--direction is required')
                expect(msg).to.not.contain('--amount is required')
            }
        })

        it('swap fails on non-existent genesis account', async () => {
            try {
                await runCli([
                    'genesis', 'swap',
                    '11111111111111111111111111111111',
                    '--buyAmount', '100000000',
                ])
                expect.fail('Should have thrown for non-existent account')
            } catch (error) {
                const msg = (error as Error).message
                expect(msg).to.satisfy(
                    (m: string) => m.includes('Failed to swap') || m.includes('not found') || m.includes('UnexpectedAccountError'),
                    'Expected error about failed swap or missing account'
                )
            }
        })

        it('swap --info fails on non-existent genesis account', async () => {
            try {
                await runCli([
                    'genesis', 'swap',
                    '11111111111111111111111111111111',
                    '--info',
                ])
                expect.fail('Should have thrown for non-existent account')
            } catch (error) {
                const msg = (error as Error).message
                expect(msg).to.satisfy(
                    (m: string) => m.includes('Failed to fetch curve info') || m.includes('not found') || m.includes('UnexpectedAccountError'),
                    'Expected error about failed info or missing account'
                )
            }
        })
    })

    describe('genesis bucket fetch --type bonding-curve', () => {

        it('reports not found for non-existent bonding curve bucket', async () => {
            const result = await createGenesisAccount({
                name: 'BC Fetch Test',
                symbol: 'BFT',
                totalSupply: '1000000000',
                decimals: 9,
            })

            try {
                await runCli([
                    'genesis', 'bucket', 'fetch',
                    result.genesisAddress,
                    '--type', 'bonding-curve',
                    '--bucketIndex', '0',
                ])
                expect.fail('Should have thrown for missing bonding curve bucket')
            } catch (error) {
                const msg = (error as Error).message
                expect(msg).to.contain('Bonding curve bucket not found')
            }
        })
    })

    describe('genesis launch create with registration flags', () => {

        it('rejects invalid --creatorWallet', async () => {
            try {
                await runCli([
                    'genesis', 'launch', 'create',
                    '--launchType', 'bonding-curve',
                    '--name', 'Test',
                    '--symbol', 'TST',
                    '--image', 'https://gateway.irys.xyz/abc123',
                    '--creatorWallet', 'not-a-valid-key',
                ])
                expect.fail('Should have thrown for invalid creatorWallet')
            } catch (error) {
                const msg = (error as Error).message
                expect(msg).to.contain('--creatorWallet must be a valid public key')
            }
        })

        it('accepts valid --creatorWallet and --twitterVerificationToken (reaches API call)', async () => {
            try {
                await runCli([
                    'genesis', 'launch', 'create',
                    '--launchType', 'bonding-curve',
                    '--name', 'Test',
                    '--symbol', 'TST',
                    '--image', 'https://gateway.irys.xyz/abc123',
                    '--creatorWallet', 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx',
                    '--twitterVerificationToken', 'test-token-123',
                ])
                expect.fail('Should have thrown an API error (API not available on localnet)')
            } catch (error) {
                // Should get past flag validation and fail at API call
                const msg = (error as Error).message
                expect(msg).to.contain('Failed')
                expect(msg).to.not.contain('--creatorWallet must be a valid public key')
            }
        })
    })

    describe('bonding curve swap integration', () => {
        let genesisAddress: string

        before(async function () {
            this.timeout(120000)
            const result = await createBondingCurveGenesis({
                name: 'Swap Test',
                symbol: 'SWT',
            })
            genesisAddress = result.genesisAddress
            await new Promise(resolve => setTimeout(resolve, 2000))
        })

        it('fetches bonding curve bucket via auto-detect', async () => {
            const { stdout, stderr, code } = await runCli([
                'genesis', 'bucket', 'fetch',
                genesisAddress,
            ])

            const clean = stripAnsi(stdout + stderr)
            expect(code).to.equal(0)
            expect(clean).to.contain('Bonding Curve Bucket')
            expect(clean).to.contain('Swappable: Yes')
            expect(clean).to.contain('Fill Percentage: 0.00%')
        })

        it('shows curve info with --info', async () => {
            const { stdout, stderr, code } = await runCli([
                'genesis', 'swap', genesisAddress, '--info',
            ])

            const clean = stripAnsi(stdout + stderr)
            expect(code).to.equal(0)
            expect(clean).to.contain('Bonding Curve Info')
            expect(clean).to.contain('Swappable: Yes')
            expect(clean).to.contain('Sold Out: No')
            expect(clean).to.contain('Fill: 0.00%')
        })

        it('shows buy quote with --info --buyAmount', async () => {
            const { stdout, stderr, code } = await runCli([
                'genesis', 'swap', genesisAddress,
                '--info', '--buyAmount', '100000000',
            ])

            const clean = stripAnsi(stdout + stderr)
            expect(code).to.equal(0)
            expect(clean).to.contain('Buy Quote')
            expect(clean).to.contain('Tokens out:')
            expect(clean).to.contain('Fee:')
        })

        // Swap execution requires a finalized genesis account, which needs a Raydium LP
        // graduation behavior. Raydium programs aren't available on localnet, so these
        // tests are skipped. They pass on devnet where the API creates finalized curves.
        it.skip('buys tokens on the bonding curve (requires finalized account - devnet only)', async () => {
            const { stdout, stderr, code } = await runCli([
                'genesis', 'swap', genesisAddress,
                '--buyAmount', '100000000',
            ])

            const clean = stripAnsi(stdout + stderr)
            expect(code).to.equal(0)
            expect(clean).to.contain('Bought tokens on bonding curve')
            expect(clean).to.contain('Direction: buy')
            expect(clean).to.contain('Amount In: 100000000')
            expect(clean).to.contain('Expected Out:')
            expect(clean).to.contain('Transaction:')
        })

        it.skip('curve info reflects the buy (requires finalized account - devnet only)', async () => {
            await new Promise(resolve => setTimeout(resolve, 2000))

            const { stdout, stderr, code } = await runCli([
                'genesis', 'swap', genesisAddress, '--info',
            ])

            const clean = stripAnsi(stdout + stderr)
            expect(code).to.equal(0)
            // Fill should be > 0 now
            expect(clean).to.not.contain('Fill: 0.00%')
        })

        it.skip('sells tokens back on the bonding curve (requires finalized account - devnet only)', async () => {
            const { stdout, stderr, code } = await runCli([
                'genesis', 'swap', genesisAddress,
                '--sellAmount', '500000000000',
            ])

            const clean = stripAnsi(stdout + stderr)
            expect(code).to.equal(0)
            expect(clean).to.contain('Sold tokens on bonding curve')
            expect(clean).to.contain('Direction: sell')
            expect(clean).to.contain('Amount In: 500000000000')
            expect(clean).to.contain('Expected Out:')
            expect(clean).to.contain('Transaction:')
        })

        it.skip('buys with custom slippage (requires finalized account - devnet only)', async () => {
            const { stdout, stderr, code } = await runCli([
                'genesis', 'swap', genesisAddress,
                '--buyAmount', '50000000',
                '--slippage', '100',
            ])

            const clean = stripAnsi(stdout + stderr)
            expect(code).to.equal(0)
            expect(clean).to.contain('Bought tokens on bonding curve')
            expect(clean).to.contain('Min Out (with 100bps slippage)')
        })
    })

    describe('genesis launch register with registration flags', () => {

        it('rejects invalid --creatorWallet on register', async () => {
            const tmpFile = path.join(os.tmpdir(), `test-reg-cw-${process.pid}.json`)
            fs.writeFileSync(tmpFile, JSON.stringify({
                wallet: 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx',
                token: { name: 'Test', symbol: 'TST', image: 'https://gateway.irys.xyz/abc' },
                launchType: 'bondingCurve',
                launch: {},
            }))

            try {
                await runCli([
                    'genesis', 'launch', 'register',
                    '11111111111111111111111111111111',
                    '--launchConfig', tmpFile,
                    '--creatorWallet', 'not-a-valid-key',
                ])
                expect.fail('Should have thrown for invalid creatorWallet')
            } catch (error) {
                const msg = (error as Error).message
                expect(msg).to.contain('--creatorWallet must be a valid public key')
            } finally {
                fs.unlinkSync(tmpFile)
            }
        })

        it('accepts valid --creatorWallet on register (reaches API call)', async () => {
            const tmpFile = path.join(os.tmpdir(), `test-reg-cw-ok-${process.pid}.json`)
            fs.writeFileSync(tmpFile, JSON.stringify({
                wallet: 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx',
                token: { name: 'Test', symbol: 'TST', image: 'https://gateway.irys.xyz/abc' },
                launchType: 'bondingCurve',
                launch: {},
            }))

            try {
                await runCli([
                    'genesis', 'launch', 'register',
                    '11111111111111111111111111111111',
                    '--launchConfig', tmpFile,
                    '--creatorWallet', 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx',
                    '--twitterVerificationToken', 'test-token-123',
                ])
                expect.fail('Should have thrown an API error')
            } catch (error) {
                const msg = (error as Error).message
                expect(msg).to.contain('Failed')
                expect(msg).to.not.contain('--creatorWallet must be a valid public key')
            } finally {
                fs.unlinkSync(tmpFile)
            }
        })
    })
})
