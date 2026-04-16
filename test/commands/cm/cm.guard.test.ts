import { exec } from 'node:child_process'
import { runCli } from '../../runCli'
import { promisify } from 'node:util'
import { createCoreCollection } from '../core/corehelpers'
import { expect } from 'chai'
import fs from 'node:fs'
import path from 'node:path'
import { CandyMachineConfig } from '../../../src/lib/cm/types.js'

const execAsync = promisify(exec)

// Helper to extract candy machine ID from cm-config.json
const getCmId = (cmDir: string): string => {
    const config = JSON.parse(fs.readFileSync(path.join(cmDir, 'cm-config.json'), 'utf8')) as CandyMachineConfig
    if (!config.candyMachineId) throw new Error('No candy machine ID in config')
    return config.candyMachineId
}

describe('cm guard commands', () => {
    before(async () => {
        await runCli(
            ["toolbox", 'sol', "airdrop", "100", "TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx"]
        )
        await new Promise(resolve => setTimeout(resolve, 10000))
    })

    it('can update guards on a candy machine', async () => {
        const cmName = "testCmGuardUpdate"

        try {
            const { collectionId } = await createCoreCollection()

            // Create CM with guards
            await execAsync(`npm run create-test-cm -- --name=${cmName} --with-config --collection=${collectionId}`)

            const { code: createCode } = await runCli(
                ["cm", "create", `./${cmName}`]
            )
            expect(createCode).to.equal(0)

            // Modify guards in config to new values
            const configPath = path.join(process.cwd(), cmName, 'cm-config.json')
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8')) as CandyMachineConfig
            config.config.guardConfig = {
                solPayment: {
                    lamports: 500000000,
                    destination: '4xbJp9sjeTEhheUDg8M1nJUomZcGmFZsjt9Gg3RQZAWp'
                }
            }
            config.config.groups = [
                {
                    label: 'wl',
                    guards: {
                        startDate: {
                            date: Math.floor(Date.now() / 1000) + 86400
                        }
                    }
                }
            ]
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

            // Update guards
            const { stdout, stderr, code } = await runCli(
                ["cm", "guard", "update", `./${cmName}`]
            )

            expect(code).to.equal(0)
            expect(stderr).to.include('Candy guard updated successfully')
            expect(stdout).to.include('Guard update complete')

            // Fetch and verify the candy machine still has a guard
            const { stdout: fetchStdout, code: fetchCode } = await runCli(
                ["cm", "fetch", getCmId(`./${cmName}`)]
            )
            expect(fetchCode).to.equal(0)
            // Should show candy guard data, not authority-only
            expect(fetchStdout).to.not.include('authority-only')

        } finally {
            try {
                await execAsync(`rm -rf ./${cmName}`)
            } catch { /* ignore cleanup errors */ }
        }
    })

    it('can remove (unwrap) candy guard from a candy machine', async () => {
        const cmName = "testCmGuardRemove"

        try {
            const { collectionId } = await createCoreCollection()

            // Create CM with guards
            await execAsync(`npm run create-test-cm -- --name=${cmName} --with-config --collection=${collectionId}`)

            const { code: createCode } = await runCli(
                ["cm", "create", `./${cmName}`]
            )
            expect(createCode).to.equal(0)

            const cmId = getCmId(`./${cmName}`)

            // Remove (unwrap) the candy guard
            const { stdout, stderr, code } = await runCli(
                ["cm", "guard", "remove", "--address", cmId, "--force"]
            )

            expect(code).to.equal(0)
            expect(stderr).to.include('Candy guard removed successfully')
            expect(stdout).to.include('Candy guard removed')

            // Fetch and verify it's now authority-only
            const { stdout: fetchStdout, code: fetchCode } = await runCli(
                ["cm", "fetch", cmId]
            )
            expect(fetchCode).to.equal(0)
            expect(fetchStdout).to.include('authority-only')

        } finally {
            try {
                await execAsync(`rm -rf ./${cmName}`)
            } catch { /* ignore cleanup errors */ }
        }
    })

    it('can delete a candy guard after removing it', async () => {
        const cmName = "testCmGuardDelete"

        try {
            const { collectionId } = await createCoreCollection()

            // Create CM with guards
            await execAsync(`npm run create-test-cm -- --name=${cmName} --with-config --collection=${collectionId}`)

            const { code: createCode, stderr: createStderr } = await runCli(
                ["cm", "create", `./${cmName}`]
            )
            expect(createCode).to.equal(0)

            const cmId = getCmId(`./${cmName}`)

            // Extract the candy guard address from fetch
            const { stdout: fetchStdout } = await runCli(
                ["cm", "fetch", cmId]
            )
            // The candy guard address is shown in the fetch output as mintAuthority
            const mintAuthorityMatch = fetchStdout.match(/"mintAuthority":\s*"([^"]+)"/)
            expect(mintAuthorityMatch).to.not.be.null
            const candyGuardAddress = mintAuthorityMatch![1]

            // Remove (unwrap) the candy guard first
            const { code: removeCode } = await runCli(
                ["cm", "guard", "remove", "--address", cmId, "--force"]
            )
            expect(removeCode).to.equal(0)

            // Delete the candy guard
            const { stdout, stderr, code } = await runCli(
                ["cm", "guard", "delete", "--address", candyGuardAddress, "--force"]
            )

            expect(code).to.equal(0)
            expect(stderr).to.include('Candy guard deleted successfully')
            expect(stdout).to.include('Candy guard deleted')

        } finally {
            try {
                await execAsync(`rm -rf ./${cmName}`)
            } catch { /* ignore cleanup errors */ }
        }
    })

    it('fails to delete a non-existent candy guard', async () => {
        const fakeAddress = '11111111111111111111111111111111'

        let failed = false
        try {
            await runCli(
                ["cm", "guard", "delete", "--address", fakeAddress, "--force"]
            )
        } catch (error) {
            failed = true
            expect((error as Error).message).to.include('does not exist')
        }
        expect(failed).to.be.true
    })

    it('fails to remove candy guard from authority-only candy machine', async () => {
        const cmName = "testCmGuardRemoveNoGuard"

        try {
            const { collectionId } = await createCoreCollection()

            // Create CM without guards (authority-only)
            await execAsync(`npm run create-test-cm -- --name=${cmName} --with-config --collection=${collectionId}`)

            const configPath = path.join(process.cwd(), cmName, 'cm-config.json')
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8')) as CandyMachineConfig
            config.config.guardConfig = {}
            config.config.groups = []
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

            const { code: createCode, stderr: createStderr } = await runCli(
                ["cm", "create", `./${cmName}`]
            )
            expect(createCode).to.equal(0)
            expect(createStderr).to.include('authority-only')

            const cmId = getCmId(`./${cmName}`)

            // Try to remove — should fail
            let failed = false
            try {
                await runCli(
                    ["cm", "guard", "remove", "--address", cmId, "--force"]
                )
            } catch (error) {
                failed = true
                expect((error as Error).message).to.include('authority-only')
            }
            expect(failed).to.be.true

        } finally {
            try {
                await execAsync(`rm -rf ./${cmName}`)
            } catch { /* ignore cleanup errors */ }
        }
    })
})
