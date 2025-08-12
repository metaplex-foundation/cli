import { exec } from 'node:child_process'
import { runCli } from '../../runCli'
import { promisify } from 'node:util'
import { createCoreCollection } from '../core/corehelpers'
import { expect } from 'chai'
import fs from 'node:fs'
import path from 'node:path'
import { CandyMachineConfig } from '../../../src/lib/cm/types.js'

const execAsync = promisify(exec)

// Helper function to check if any guards are configured (duplicated from create.ts for testing)
function hasGuards(candyMachineConfig: CandyMachineConfig): boolean {
    const guardConfig = candyMachineConfig.config.guardConfig
    const groups = candyMachineConfig.config.groups

    // Check if there are any global guards
    if (guardConfig && Object.keys(guardConfig).length > 0) {
        return true
    }

    // Check if there are any groups with guards
    if (groups && groups.length > 0) {
        for (const group of groups) {
            if (group.guards && Object.keys(group.guards).length > 0) {
                return true
            }
        }
    }

    return false
}

describe('cm create commands', () => {
    before(async () => {
        const { stdout, stderr, code } = await runCli(
            ["toolbox", 'sol', "airdrop", "100", "TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx"]
        )
        // console.log('Airdrop stdout:', stdout)
        // console.log('Airdrop stderr:', stderr)
        // console.log('Airdrop code:', code)
        await new Promise(resolve => setTimeout(resolve, 10000))


    })

    it('can create a cm through single command', async () => {
        const cmName = "testCm1"

        try {
            const { collectionId } = await createCoreCollection()

            // console.log('Creating test candy machine directory')
            // Await the directory creation
            await execAsync(`npm run create-test-cm -- --name=${cmName} --with-config --collection=${collectionId}`)

            const { stdout, stderr, code } = await runCli(
                ["cm", "create", `./${cmName}`]
            )

            // Assert the command succeeded
            expect(code).to.equal(0)
            expect(stdout).to.include('Tx confirmed')
            expect(stderr).to.include('Candy machine created')
        } finally {
            // Clean up even if test fails
            try {
                await execAsync(`rm -rf ./${cmName}`)
                // console.log(`Cleaned up ${cmName} directory`)
            } catch (cleanupError) {
                // console.error(`Cleanup failed for ${cmName}:`, cleanupError)
            }
        }
    })

    describe('hasGuards helper function', () => {
        it('should return false for empty guard config', () => {
            const config: CandyMachineConfig = {
                name: 'test',
                config: {
                    collection: '11111111111111111111111111111111',
                    itemsAvailable: 100,
                    isMutable: true,
                    isSequential: false,
                    guardConfig: {},
                    groups: []
                }
            }
            expect(hasGuards(config)).to.be.false
        })

        it('should return false for undefined guard config', () => {
            const config: CandyMachineConfig = {
                name: 'test',
                config: {
                    collection: '11111111111111111111111111111111',
                    itemsAvailable: 100,
                    isMutable: true,
                    isSequential: false
                }
            }
            expect(hasGuards(config)).to.be.false
        })

        it('should return true for global guards', () => {
            const config: CandyMachineConfig = {
                name: 'test',
                config: {
                    collection: '11111111111111111111111111111111',
                    itemsAvailable: 100,
                    isMutable: true,
                    isSequential: false,
                    guardConfig: {
                        solPayment: {
                            lamports: 1000000,
                            destination: '11111111111111111111111111111111'
                        }
                    },
                    groups: []
                }
            }
            expect(hasGuards(config)).to.be.true
        })

        it('should return true for guards in groups', () => {
            const config: CandyMachineConfig = {
                name: 'test',
                config: {
                    collection: '11111111111111111111111111111111',
                    itemsAvailable: 100,
                    isMutable: true,
                    isSequential: false,
                    guardConfig: {},
                    groups: [
                        {
                            label: 'group1',
                            guards: {
                                startDate: {
                                    date: Math.floor(Date.now() / 1000)
                                }
                            }
                        }
                    ]
                }
            }
            expect(hasGuards(config)).to.be.true
        })

        it('should return false for groups with empty guards', () => {
            const config: CandyMachineConfig = {
                name: 'test',
                config: {
                    collection: '11111111111111111111111111111111',
                    itemsAvailable: 100,
                    isMutable: true,
                    isSequential: false,
                    guardConfig: {},
                    groups: [
                        {
                            label: 'group1',
                            guards: {}
                        }
                    ]
                }
            }
            expect(hasGuards(config)).to.be.false
        })
    })

    it('can create a cm without guards (authority-only)', async () => {
        const cmName = "testCmNoGuards"

        try {
            const { collectionId } = await createCoreCollection()

            // Create test candy machine directory with no guards
            await execAsync(`npm run create-test-cm -- --name=${cmName} --with-config --collection=${collectionId}`)

            // Ensure the config has no guards
            const configPath = path.join(process.cwd(), cmName, 'cm-config.json')
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8')) as CandyMachineConfig
            config.config.guardConfig = {} // Remove any default guards
            config.config.groups = [] // Remove any default groups
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

            const { stdout, stderr, code } = await runCli(
                ["cm", "create", `./${cmName}`]
            )

            // Assert the command succeeded
            expect(code).to.equal(0)
            expect(stdout).to.include('Tx confirmed')
            expect(stderr).to.include('authority-only minting') // New message for no guards
        } finally {
            try {
                await execAsync(`rm -rf ./${cmName}`)
            } catch (cleanupError) {
                // Ignore cleanup errors
            }
        }
    })

    it('can create a cm with guards (wrapped)', async () => {
        const cmName = "testCmWithGuards"

        try {
            const { collectionId } = await createCoreCollection()

            // Create test candy machine directory
            await execAsync(`npm run create-test-cm -- --name=${cmName} --with-config --collection=${collectionId}`)

            // Add guards to the config
            const configPath = path.join(process.cwd(), cmName, 'cm-config.json')
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8')) as CandyMachineConfig
            config.config.guardConfig = {
                solPayment: {
                    lamports: 1000000,
                    destination: '11111111111111111111111111111111'
                }
            }
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

            const { stdout, stderr, code } = await runCli(
                ["cm", "create", `./${cmName}`]
            )

            // Assert the command succeeded
            expect(code).to.equal(0)
            expect(stdout).to.include('Tx confirmed')
            expect(stderr).to.include('created with guards') // New message for with guards
        } finally {
            try {
                await execAsync(`rm -rf ./${cmName}`)
            } catch (cleanupError) {
                // Ignore cleanup errors
            }
        }
    })
})