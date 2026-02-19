import { expect } from 'chai'
import fs from 'node:fs'
import path from 'node:path'
import { runCli } from '../../runCli'
import { stripAnsi } from './genesishelpers'

describe('genesis launch commands', () => {

    before(async () => {
        try {
            await runCli(
                ["toolbox", "sol", "airdrop", "100", "TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx"]
            )
        } catch (error) {
            // runCli may reject on OCLIF warnings in stderr (e.g. missing exports
            // from updated SDK). The airdrop still succeeds if exit code is 0.
            if (!(error as Error).message.includes('code 0')) {
                throw error
            }
        }

        await new Promise(resolve => setTimeout(resolve, 10000))
    })

    describe('genesis launch create', () => {

        it('fails when required flags are missing (no --name)', async () => {
            const cliInput = [
                'genesis', 'launch', 'create',
                '--symbol', 'MTK',
                '--image', 'https://gateway.irys.xyz/abc123',
                '--tokenAllocation', '500000000',
                '--depositStartTime', '2025-03-01T00:00:00Z',
                '--raiseGoal', '200',
                '--raydiumLiquidityBps', '5000',
                '--fundsRecipient', 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx',
            ]

            try {
                await runCli(cliInput)
                expect.fail('Should have thrown an error for missing required flag')
            } catch (error) {
                expect((error as Error).message).to.contain('Missing required flag')
            }
        })

        it('fails when required flags are missing (no --symbol)', async () => {
            const cliInput = [
                'genesis', 'launch', 'create',
                '--name', 'My Token',
                '--image', 'https://gateway.irys.xyz/abc123',
                '--tokenAllocation', '500000000',
                '--depositStartTime', '2025-03-01T00:00:00Z',
                '--raiseGoal', '200',
                '--raydiumLiquidityBps', '5000',
                '--fundsRecipient', 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx',
            ]

            try {
                await runCli(cliInput)
                expect.fail('Should have thrown an error for missing required flag')
            } catch (error) {
                expect((error as Error).message).to.contain('Missing required flag')
            }
        })

        it('fails when required flags are missing (no --image)', async () => {
            const cliInput = [
                'genesis', 'launch', 'create',
                '--name', 'My Token',
                '--symbol', 'MTK',
                '--tokenAllocation', '500000000',
                '--depositStartTime', '2025-03-01T00:00:00Z',
                '--raiseGoal', '200',
                '--raydiumLiquidityBps', '5000',
                '--fundsRecipient', 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx',
            ]

            try {
                await runCli(cliInput)
                expect.fail('Should have thrown an error for missing required flag')
            } catch (error) {
                expect((error as Error).message).to.contain('Missing required flag')
            }
        })

        it('fails when required flags are missing (no --tokenAllocation)', async () => {
            const cliInput = [
                'genesis', 'launch', 'create',
                '--name', 'My Token',
                '--symbol', 'MTK',
                '--image', 'https://gateway.irys.xyz/abc123',
                '--depositStartTime', '2025-03-01T00:00:00Z',
                '--raiseGoal', '200',
                '--raydiumLiquidityBps', '5000',
                '--fundsRecipient', 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx',
            ]

            try {
                await runCli(cliInput)
                expect.fail('Should have thrown an error for missing required flag')
            } catch (error) {
                expect((error as Error).message).to.contain('Missing required flag')
            }
        })

        it('fails when required flags are missing (no --raiseGoal)', async () => {
            const cliInput = [
                'genesis', 'launch', 'create',
                '--name', 'My Token',
                '--symbol', 'MTK',
                '--image', 'https://gateway.irys.xyz/abc123',
                '--tokenAllocation', '500000000',
                '--depositStartTime', '2025-03-01T00:00:00Z',
                '--raydiumLiquidityBps', '5000',
                '--fundsRecipient', 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx',
            ]

            try {
                await runCli(cliInput)
                expect.fail('Should have thrown an error for missing required flag')
            } catch (error) {
                expect((error as Error).message).to.contain('Missing required flag')
            }
        })

        it('fails with non-existent locked allocations file', async () => {
            const cliInput = [
                'genesis', 'launch', 'create',
                '--name', 'My Token',
                '--symbol', 'MTK',
                '--image', 'https://gateway.irys.xyz/abc123',
                '--tokenAllocation', '500000000',
                '--depositStartTime', '2025-03-01T00:00:00Z',
                '--raiseGoal', '200',
                '--raydiumLiquidityBps', '5000',
                '--fundsRecipient', 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx',
                '--lockedAllocations', '/tmp/nonexistent-file-12345.json',
            ]

            try {
                await runCli(cliInput)
                expect.fail('Should have thrown an error for non-existent file')
            } catch (error) {
                expect((error as Error).message).to.contain('not found')
            }
        })

        it('calls the Genesis API with valid flags (expects API error since API is not local)', async () => {
            const cliInput = [
                'genesis', 'launch', 'create',
                '--name', 'My Token',
                '--symbol', 'MTK',
                '--image', 'https://gateway.irys.xyz/abc123',
                '--tokenAllocation', '500000000',
                '--depositStartTime', '2025-06-01T00:00:00Z',
                '--raiseGoal', '200',
                '--raydiumLiquidityBps', '5000',
                '--fundsRecipient', 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx',
            ]

            try {
                await runCli(cliInput)
                expect.fail('Should have thrown an API error (API not available on localnet)')
            } catch (error) {
                // The command should get past flag parsing and validation,
                // then fail at the API call
                const msg = (error as Error).message
                expect(msg).to.contain('Failed')
            }
        })
    })

    describe('genesis launch register', () => {

        it('fails when genesis account argument is missing', async () => {
            // Create a temp config file for the test
            const tmpConfig = path.join('/tmp', 'test-launch-config.json')
            fs.writeFileSync(tmpConfig, JSON.stringify({
                wallet: 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx',
                token: { name: 'Test', symbol: 'TST', image: 'https://gateway.irys.xyz/abc' },
                launchType: 'project',
                launch: {
                    launchpool: {
                        tokenAllocation: 500000000,
                        depositStartTime: '2025-06-01T00:00:00Z',
                        raiseGoal: 200,
                        raydiumLiquidityBps: 5000,
                        fundsRecipient: 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx',
                    },
                },
            }))

            const cliInput = [
                'genesis', 'launch', 'register',
                '--launchConfig', tmpConfig,
            ]

            try {
                await runCli(cliInput)
                expect.fail('Should have thrown an error for missing argument')
            } catch (error) {
                expect((error as Error).message).to.not.be.empty
            }

            fs.unlinkSync(tmpConfig)
        })

        it('fails when --launchConfig is missing', async () => {
            const cliInput = [
                'genesis', 'launch', 'register',
                '11111111111111111111111111111111',
            ]

            try {
                await runCli(cliInput)
                expect.fail('Should have thrown an error for missing flag')
            } catch (error) {
                expect((error as Error).message).to.contain('Missing required flag')
            }
        })

        it('fails with non-existent launch config file', async () => {
            const cliInput = [
                'genesis', 'launch', 'register',
                '11111111111111111111111111111111',
                '--launchConfig', '/tmp/nonexistent-config-12345.json',
            ]

            try {
                await runCli(cliInput)
                expect.fail('Should have thrown an error for non-existent file')
            } catch (error) {
                expect((error as Error).message).to.contain('not found')
            }
        })

        it('calls the Genesis API with valid input (expects API error since API is not local)', async () => {
            const tmpConfig = path.join('/tmp', 'test-launch-config-register.json')
            fs.writeFileSync(tmpConfig, JSON.stringify({
                wallet: 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx',
                token: { name: 'Test', symbol: 'TST', image: 'https://gateway.irys.xyz/abc' },
                launchType: 'project',
                launch: {
                    launchpool: {
                        tokenAllocation: 500000000,
                        depositStartTime: '2025-06-01T00:00:00Z',
                        raiseGoal: 200,
                        raydiumLiquidityBps: 5000,
                        fundsRecipient: 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx',
                    },
                },
            }))

            const cliInput = [
                'genesis', 'launch', 'register',
                '11111111111111111111111111111111',
                '--launchConfig', tmpConfig,
            ]

            try {
                await runCli(cliInput)
                expect.fail('Should have thrown an API error')
            } catch (error) {
                const msg = (error as Error).message
                expect(msg).to.contain('Failed')
            }

            fs.unlinkSync(tmpConfig)
        })
    })
})
