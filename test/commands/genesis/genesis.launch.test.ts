import { expect } from 'chai'
import fs from 'node:fs'
import path from 'node:path'
import { runCli } from '../../runCli'
import { stripAnsi, createGenesisAccount, addLaunchPoolBucket } from './genesishelpers'

/** Return an ISO timestamp offset from now by the given number of seconds. */
function futureIso(offsetSeconds: number): string {
    return new Date(Date.now() + offsetSeconds * 1000).toISOString()
}

describe('genesis launch commands', () => {

    before(async () => {
        await runCli(["toolbox", "sol", "airdrop", "100", "TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx"])
        await new Promise(resolve => setTimeout(resolve, 10000))
        await runCli(['toolbox', 'sol', 'wrap', '50'])
    })

    describe('genesis launch create', () => {

        it('fails when all required flags are missing', async () => {
            try {
                await runCli(['genesis', 'launch', 'create'])
                expect.fail('Should have thrown an error for missing required flags')
            } catch (error) {
                const msg = (error as Error).message
                expect(msg).to.contain('Missing required flag')
                expect(msg).to.contain('name')
                expect(msg).to.contain('symbol')
                expect(msg).to.contain('image')
                expect(msg).to.contain('tokenAllocation')
                expect(msg).to.contain('depositStartTime')
                expect(msg).to.contain('raiseGoal')
                expect(msg).to.contain('raydiumLiquidityBps')
                expect(msg).to.contain('fundsRecipient')
            }
        })

        it('fails when required flags are missing (no --name)', async () => {
            const cliInput = [
                'genesis', 'launch', 'create',
                '--symbol', 'MTK',
                '--image', 'https://gateway.irys.xyz/abc123',
                '--tokenAllocation', '500000000',
                '--depositStartTime', futureIso(7 * 86400),
                '--raiseGoal', '200',
                '--raydiumLiquidityBps', '5000',
                '--fundsRecipient', 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx',
            ]

            try {
                await runCli(cliInput)
                expect.fail('Should have thrown an error for missing required flag')
            } catch (error) {
                expect((error as Error).message).to.contain('Missing required flag')
                expect((error as Error).message).to.contain('name')
            }
        })

        it('fails when required flags are missing (no --symbol)', async () => {
            const cliInput = [
                'genesis', 'launch', 'create',
                '--name', 'My Token',
                '--image', 'https://gateway.irys.xyz/abc123',
                '--tokenAllocation', '500000000',
                '--depositStartTime', futureIso(7 * 86400),
                '--raiseGoal', '200',
                '--raydiumLiquidityBps', '5000',
                '--fundsRecipient', 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx',
            ]

            try {
                await runCli(cliInput)
                expect.fail('Should have thrown an error for missing required flag')
            } catch (error) {
                expect((error as Error).message).to.contain('Missing required flag')
                expect((error as Error).message).to.contain('symbol')
            }
        })

        it('fails when required flags are missing (no --image)', async () => {
            const cliInput = [
                'genesis', 'launch', 'create',
                '--name', 'My Token',
                '--symbol', 'MTK',
                '--tokenAllocation', '500000000',
                '--depositStartTime', futureIso(7 * 86400),
                '--raiseGoal', '200',
                '--raydiumLiquidityBps', '5000',
                '--fundsRecipient', 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx',
            ]

            try {
                await runCli(cliInput)
                expect.fail('Should have thrown an error for missing required flag')
            } catch (error) {
                expect((error as Error).message).to.contain('Missing required flag')
                expect((error as Error).message).to.contain('image')
            }
        })

        it('fails when required flags are missing (no --tokenAllocation)', async () => {
            const cliInput = [
                'genesis', 'launch', 'create',
                '--name', 'My Token',
                '--symbol', 'MTK',
                '--image', 'https://gateway.irys.xyz/abc123',
                '--depositStartTime', futureIso(7 * 86400),
                '--raiseGoal', '200',
                '--raydiumLiquidityBps', '5000',
                '--fundsRecipient', 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx',
            ]

            try {
                await runCli(cliInput)
                expect.fail('Should have thrown an error for missing required flag')
            } catch (error) {
                expect((error as Error).message).to.contain('Missing required flag')
                expect((error as Error).message).to.contain('tokenAllocation')
            }
        })

        it('fails when required flags are missing (no --depositStartTime)', async () => {
            const cliInput = [
                'genesis', 'launch', 'create',
                '--name', 'My Token',
                '--symbol', 'MTK',
                '--image', 'https://gateway.irys.xyz/abc123',
                '--tokenAllocation', '500000000',
                '--raiseGoal', '200',
                '--raydiumLiquidityBps', '5000',
                '--fundsRecipient', 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx',
            ]

            try {
                await runCli(cliInput)
                expect.fail('Should have thrown an error for missing required flag')
            } catch (error) {
                expect((error as Error).message).to.contain('Missing required flag')
                expect((error as Error).message).to.contain('depositStartTime')
            }
        })

        it('fails when required flags are missing (no --raiseGoal)', async () => {
            const cliInput = [
                'genesis', 'launch', 'create',
                '--name', 'My Token',
                '--symbol', 'MTK',
                '--image', 'https://gateway.irys.xyz/abc123',
                '--tokenAllocation', '500000000',
                '--depositStartTime', futureIso(7 * 86400),
                '--raydiumLiquidityBps', '5000',
                '--fundsRecipient', 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx',
            ]

            try {
                await runCli(cliInput)
                expect.fail('Should have thrown an error for missing required flag')
            } catch (error) {
                expect((error as Error).message).to.contain('Missing required flag')
                expect((error as Error).message).to.contain('raiseGoal')
            }
        })

        it('fails when required flags are missing (no --raydiumLiquidityBps)', async () => {
            const cliInput = [
                'genesis', 'launch', 'create',
                '--name', 'My Token',
                '--symbol', 'MTK',
                '--image', 'https://gateway.irys.xyz/abc123',
                '--tokenAllocation', '500000000',
                '--depositStartTime', futureIso(7 * 86400),
                '--raiseGoal', '200',
                '--fundsRecipient', 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx',
            ]

            try {
                await runCli(cliInput)
                expect.fail('Should have thrown an error for missing required flag')
            } catch (error) {
                expect((error as Error).message).to.contain('Missing required flag')
                expect((error as Error).message).to.contain('raydiumLiquidityBps')
            }
        })

        it('fails when required flags are missing (no --fundsRecipient)', async () => {
            const cliInput = [
                'genesis', 'launch', 'create',
                '--name', 'My Token',
                '--symbol', 'MTK',
                '--image', 'https://gateway.irys.xyz/abc123',
                '--tokenAllocation', '500000000',
                '--depositStartTime', futureIso(7 * 86400),
                '--raiseGoal', '200',
                '--raydiumLiquidityBps', '5000',
            ]

            try {
                await runCli(cliInput)
                expect.fail('Should have thrown an error for missing required flag')
            } catch (error) {
                expect((error as Error).message).to.contain('Missing required flag')
                expect((error as Error).message).to.contain('fundsRecipient')
            }
        })

        it('fails with non-existent locked allocations file', async () => {
            const cliInput = [
                'genesis', 'launch', 'create',
                '--name', 'My Token',
                '--symbol', 'MTK',
                '--image', 'https://gateway.irys.xyz/abc123',
                '--tokenAllocation', '500000000',
                '--depositStartTime', futureIso(7 * 86400),
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

        it('fails when locked allocations file is not a JSON array', async () => {
            const tmpFile = path.join('/tmp', 'test-bad-allocations.json')
            fs.writeFileSync(tmpFile, JSON.stringify({ notAnArray: true }))

            const cliInput = [
                'genesis', 'launch', 'create',
                '--name', 'My Token',
                '--symbol', 'MTK',
                '--image', 'https://gateway.irys.xyz/abc123',
                '--tokenAllocation', '500000000',
                '--depositStartTime', futureIso(7 * 86400),
                '--raiseGoal', '200',
                '--raydiumLiquidityBps', '5000',
                '--fundsRecipient', 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx',
                '--lockedAllocations', tmpFile,
            ]

            try {
                await runCli(cliInput)
                expect.fail('Should have thrown an error for non-array allocations')
            } catch (error) {
                expect((error as Error).message).to.contain('must contain a JSON array')
            }

            fs.unlinkSync(tmpFile)
        })

        it('parses locked allocations file and reaches API call', async () => {
            const tmpFile = path.join('/tmp', 'test-locked-allocations.json')
            fs.writeFileSync(tmpFile, JSON.stringify([
                {
                    name: 'Team',
                    recipient: 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx',
                    tokenAmount: 200000000,
                    vestingStartTime: futureIso(30 * 86400),
                    vestingDuration: { value: 1, unit: 'YEAR' },
                    unlockSchedule: 'MONTH',
                    cliff: {
                        duration: { value: 3, unit: 'MONTH' },
                        unlockAmount: 50000000,
                    },
                },
            ]))

            const cliInput = [
                'genesis', 'launch', 'create',
                '--name', 'My Token',
                '--symbol', 'MTK',
                '--image', 'https://gateway.irys.xyz/abc123',
                '--tokenAllocation', '500000000',
                '--depositStartTime', futureIso(30 * 86400),
                '--raiseGoal', '200',
                '--raydiumLiquidityBps', '5000',
                '--fundsRecipient', 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx',
                '--lockedAllocations', tmpFile,
            ]

            try {
                await runCli(cliInput)
                expect.fail('Should have thrown an API error (API not available on localnet)')
            } catch (error) {
                // Should get past file parsing and validation, then fail at the API call
                const msg = (error as Error).message
                expect(msg).to.contain('Failed')
            }

            fs.unlinkSync(tmpFile)
        })

        it('passes optional metadata flags and reaches API call', async () => {
            const cliInput = [
                'genesis', 'launch', 'create',
                '--name', 'My Token',
                '--symbol', 'MTK',
                '--image', 'https://gateway.irys.xyz/abc123',
                '--description', 'A test token with all metadata',
                '--website', 'https://example.com',
                '--twitter', 'https://x.com/testproject',
                '--telegram', 'https://t.me/testproject',
                '--tokenAllocation', '500000000',
                '--depositStartTime', futureIso(30 * 86400),
                '--raiseGoal', '200',
                '--raydiumLiquidityBps', '5000',
                '--fundsRecipient', 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx',
            ]

            try {
                await runCli(cliInput)
                expect.fail('Should have thrown an API error (API not available on localnet)')
            } catch (error) {
                // Should get past flag parsing and validation (including metadata),
                // then fail at the API call
                const msg = (error as Error).message
                expect(msg).to.contain('Failed')
            }
        })

        it('calls the Genesis API with valid flags (expects API error since API is not local)', async () => {
            const cliInput = [
                'genesis', 'launch', 'create',
                '--name', 'My Token',
                '--symbol', 'MTK',
                '--image', 'https://gateway.irys.xyz/abc123',
                '--tokenAllocation', '500000000',
                '--depositStartTime', futureIso(30 * 86400),
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
                        depositStartTime: futureIso(30 * 86400),
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
                expect((error as Error).message).to.contain('launchConfig')
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
                        depositStartTime: futureIso(30 * 86400),
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

    describe('add-launch-pool with claimSchedule (createClaimSchedule)', () => {
        let genesisAddress: string

        it('creates a genesis account for claimSchedule test', async () => {
            const result = await createGenesisAccount({
                name: 'ClaimSchedule Test',
                symbol: 'CST',
                totalSupply: '1000000000',
                decimals: 9,
            })

            genesisAddress = result.genesisAddress
        })

        it('adds a launch pool bucket with claimSchedule', async () => {
            const now = Math.floor(Date.now() / 1000)
            const depositStart = (now - 3600).toString()
            const depositEnd = (now + 86400).toString()
            const claimStart = (now + 86400 + 1).toString()
            const claimEnd = (now + 86400 * 365).toString()

            const claimSchedule = JSON.stringify({
                startTime: now + 86400 + 1,
                endTime: now + 86400 * 100,
                period: 86400,
                cliffTime: now + 86400 + 1,
                cliffAmountBps: 1000,
            })

            const cliInput = [
                'genesis', 'bucket', 'add-launch-pool',
                genesisAddress,
                '--allocation', '1000000000',
                '--depositStart', depositStart,
                '--depositEnd', depositEnd,
                '--claimStart', claimStart,
                '--claimEnd', claimEnd,
                '--claimSchedule', claimSchedule,
            ]

            const { stdout, stderr, code } = await runCli(cliInput)

            const cleanStderr = stripAnsi(stderr)
            const cleanStdout = stripAnsi(stdout)

            expect(code).to.equal(0)
            expect(cleanStderr).to.contain('Launch pool bucket added successfully')
            expect(cleanStdout).to.contain('Token Allocation: 1000000000')
        })

        it('fetches the bucket and verifies it was created', async () => {
            await new Promise(resolve => setTimeout(resolve, 2000))

            const { stdout, stderr, code } = await runCli([
                'genesis', 'bucket', 'fetch',
                genesisAddress,
                '--bucketIndex', '0',
            ])

            const cleanStderr = stripAnsi(stderr)
            const cleanStdout = stripAnsi(stdout)

            expect(code).to.equal(0)
            expect(cleanStderr).to.contain('Bucket fetched successfully')
            expect(cleanStdout).to.contain('Launch Pool Bucket')
            expect(cleanStdout).to.contain('Base Token Allocation: 1000000000')
        })
    })

    describe('transition uses triggerBehaviorsV2', () => {
        let genesisAddress: string

        it('creates a genesis account for transition test', async () => {
            const result = await createGenesisAccount({
                name: 'Transition Test',
                symbol: 'TRN',
                totalSupply: '1000000000',
                decimals: 9,
            })

            genesisAddress = result.genesisAddress
        })

        it('adds a launch pool bucket', async () => {
            const now = Math.floor(Date.now() / 1000)
            const result = await addLaunchPoolBucket(genesisAddress, {
                allocation: '1000000000',
                depositStart: (now - 3600).toString(),
                depositEnd: (now + 86400).toString(),
                claimStart: (now + 86400 + 1).toString(),
                claimEnd: (now + 86400 * 365).toString(),
            })

            expect(result.bucketAddress).to.be.a('string')
        })

        it('transition invokes triggerBehaviorsV2 on-chain', async () => {
            // The transition command invokes triggerBehaviorsV2.
            // It will fail because the account is not finalized,
            // but the program log confirms the renamed function is called.
            try {
                await runCli([
                    'genesis', 'transition', genesisAddress,
                    '--bucketIndex', '0',
                ])
                expect.fail('Should have thrown an error since account is not finalized')
            } catch (error) {
                const msg = (error as Error).message
                // The program log shows "TriggerBehaviorsV2" confirming the rename works
                expect(msg).to.contain('TriggerBehaviorsV2')
            }
        })
    })
})
