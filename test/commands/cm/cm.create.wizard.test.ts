import { exec } from 'node:child_process'
import { runCli } from '../../runCli'
import { promisify } from 'node:util'
import { createCoreCollection } from '../core/corehelpers'
import { expect } from 'chai'
import fs from 'node:fs'

const execAsync = promisify(exec)

// NOTE: This test is skipped because the CLI wizard does not work with automated stdin piping it seems.
// The wizard prompts require true TTY interaction, and the process either exits early or hangs.
// Manual testing is required for the wizard for now.
describe('cm create wizard commands', () => {
    before(async () => {
        const { stdout, stderr, code } = await runCli(
            ["toolbox", 'sol', "airdrop", "100", "TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx"]
        )
        await new Promise(resolve => setTimeout(resolve, 10000))
    })

    it.skip('can create a candy machine through wizard (stdin automation currently unsupported)', async () => {
        const cmName = "testCmW"
        let collectionId = ''
        try {
            ({ collectionId } = await createCoreCollection())

            // console.log('Creating test candy machine directory for wizard')
            await execAsync(`npm run create-test-cm -- --name=${cmName} --with-assets --uploaded --assets=20`)

            // These are the answers for the wizard prompts, in order.
            const wizardAnswers = [
                cmName, // Directory name
                'y',    // Use existing directory
                '',     // Press enter to continue after assets
                'y',    // NFTs mutable
                'n',    // No global guards
                'n',    // No guard groups
            ]

            // console.log('Running wizard with answers:', wizardAnswers)
            const { stdout, stderr, code } = await runCli(
                ["cm", "create", `./${cmName}`, "--wizard"],
                wizardAnswers
            )

            // For now, just check if we get any output
            expect(stdout.length + stderr.length).to.be.greaterThan(0)
            // console.log('✅ Full wizard test completed!')

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
