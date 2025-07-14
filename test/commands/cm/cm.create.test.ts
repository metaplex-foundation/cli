import { exec } from 'child_process'
import { runCli } from '../../runCli'
import { promisify } from 'util'
import { createCoreCollection } from '../core/corehelpers'
import { expect } from 'chai'

const execAsync = promisify(exec)

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
            await execAsync("npm run create-test-cm -- --name=" + cmName + " --with-config --collection=" + collectionId)

            const { stdout, stderr, code } = await runCli(
                ["cm", "create", "./" + cmName]
            )

            // Assert the command succeeded
            expect(code).to.equal(0)
            expect(stdout).to.include('Tx confirmed')
            expect(stderr).to.include('Candy machine created')
        } finally {
            // Clean up even if test fails
            try {
                await execAsync("rm -rf ./" + cmName)
                // console.log(`Cleaned up ${cmName} directory`)
            } catch (cleanupError) {
                // console.error(`Cleanup failed for ${cmName}:`, cleanupError)
            }
        }
    })
})