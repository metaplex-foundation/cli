import { expect } from 'chai'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { runCli } from '../../runCli'
import { createGenesisAccount } from './genesishelpers'

describe('genesis swap and bonding curve commands', () => {

    before(async () => {
        await runCli(['toolbox', 'sol', 'airdrop', '100', 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx'])
        await new Promise<void>(resolve => { setTimeout(resolve, 5000) })
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
                decimals: 9,
                name: 'BC Fetch Test',
                symbol: 'BFT',
                totalSupply: '1000000000',
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

    describe('genesis launch register with registration flags', () => {

        it('rejects invalid --creatorWallet on register', async () => {
            const tmpFile = path.join(os.tmpdir(), `test-reg-cw-${process.pid}.json`)
            fs.writeFileSync(tmpFile, JSON.stringify({
                launch: {},
                launchType: 'bondingCurve',
                token: { image: 'https://gateway.irys.xyz/abc', name: 'Test', symbol: 'TST' },
                wallet: 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx',
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
                launch: {},
                launchType: 'bondingCurve',
                token: { image: 'https://gateway.irys.xyz/abc', name: 'Test', symbol: 'TST' },
                wallet: 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx',
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
