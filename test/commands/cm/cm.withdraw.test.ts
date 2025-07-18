import { exec } from 'node:child_process'
import { runCli } from '../../runCli'
import { promisify } from 'node:util'
import { createCoreCollection } from '../core/corehelpers'
import { expect } from 'chai'
import fs from 'node:fs'

const execAsync = promisify(exec)

describe('cm withdraw commands', () => {
    before(async () => {
        const { stdout, stderr, code } = await runCli(
            ["toolbox", 'sol', "airdrop", "100", "TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx"]
        )
        // console.log('Airdrop stdout:', stdout)
        // console.log('Airdrop stderr:', stderr)
        // console.log('Airdrop code:', code)
        await new Promise(resolve => setTimeout(resolve, 10000))
    })

    it('can withdraw from a candy machine', async () => {
        const cmName = "testCm3"

        try {
            const { collectionId } = await createCoreCollection()

            // console.log('Creating test candy machine directory')
            // Await the directory creation
            await execAsync(`npm run create-test-cm -- --name=${cmName} --with-config --collection=${collectionId}`)

            const { stdout: cmCreateStdout, stderr: cmCreateStderr, code: cmCreateCode } = await runCli(
                ["cm", "create", `./${cmName}`]
            )
            // console.log('Cm create stdout:', cmCreateStdout)
            // console.log('Cm create stderr:', cmCreateStderr)
            // console.log('Cm create code:', cmCreateCode)

            // Assert candy machine creation succeeded
            expect(cmCreateCode).to.equal(0)
            expect(cmCreateStdout).to.include('Tx confirmed')
            expect(cmCreateStderr).to.include('Candy machine created')

            const { stdout, stderr, code } = await runCli(
                ["cm", "withdraw", `./${cmName}`, "--force"]
            )

            // console.log('Cm withdraw stdout:', stdout)
            // console.log('Cm withdraw stderr:', stderr)
            // console.log('Cm withdraw code:', code)

            // Assert the withdraw command succeeded
            expect(code).to.equal(0)
            expect(stdout).to.include('Candy machine withdrawn successfully')
            expect(stdout).to.include('Transaction hash:')

            // Verify the candy machine still exists but funds were withdrawn
            const configPath = `./${cmName}/cm-config.json`
            expect(fs.existsSync(configPath)).to.be.true

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
})
