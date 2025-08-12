import { exec } from 'node:child_process'
import { runCli } from '../../runCli'
import { promisify } from 'node:util'
import { createCoreCollection } from '../core/corehelpers'
import { expect } from 'chai'
import fs from 'node:fs'

const execAsync = promisify(exec)

describe('cm full lifecycle commands', () => {
    before(async () => {
        const { stdout, stderr, code } = await runCli(
            ["toolbox", 'sol', "airdrop", "100", "TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx"]
        )
        // console.log('Airdrop stdout:', stdout)
        // console.log('Airdrop stderr:', stderr)
        // console.log('Airdrop code:', code)
        await new Promise(resolve => setTimeout(resolve, 10000))
    })

    it('can complete full candy machine lifecycle: create → insert → withdraw', async () => {
        const cmName = "testCmFull"

        try {
            const { collectionId } = await createCoreCollection()

            // console.log('Creating test candy machine directory with assets and config')
            // Create directory with assets (uploaded) and config
            await execAsync(`npm run create-test-cm -- --name=${cmName} --with-config --collection=${collectionId} --with-assets --uploaded --assets=10`)

            // Step 1: Create candy machine
            // console.log('Step 1: Creating candy machine...')
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

            // Step 2: Insert assets
            // console.log('Step 2: Inserting assets...')
            const { stdout: cmInsertStdout, stderr: cmInsertStderr, code: cmInsertCode } = await runCli(
                ["cm", "insert", `./${cmName}`]
            )
            // console.log('Cm insert stdout:', cmInsertStdout)
            // console.log('Cm insert stderr:', cmInsertStderr)
            // console.log('Cm insert code:', cmInsertCode)

            // Assert the insert command succeeded
            expect(cmInsertCode).to.equal(0)
            expect(cmInsertStdout).to.include('Asset cache updated successfully')
            expect(cmInsertStderr).to.include('Sent')
            expect(cmInsertStderr).to.include('Confirmed')
            expect(cmInsertStderr).to.include('transactions')

            // Verify the asset cache file exists and was modified
            const cachePath = `./${cmName}/asset-cache.json`
            expect(fs.existsSync(cachePath)).to.be.true

            // Check that some assets were marked as loaded
            const cacheContent = JSON.parse(fs.readFileSync(cachePath, 'utf-8'))
            const loadedAssets = Object.values(cacheContent.assetItems).filter((asset: any) => asset.loaded === true)
            expect(loadedAssets.length).to.be.greaterThan(0)

            // Step 3: Withdraw candy machine
            // console.log('Step 3: Withdrawing candy machine...')
            const { stdout: cmWithdrawStdout, stderr: cmWithdrawStderr, code: cmWithdrawCode } = await runCli(
                ["cm", "withdraw", `./${cmName}`, "--force"]
            )
            // console.log('Cm withdraw stdout:', cmWithdrawStdout)
            // console.log('Cm withdraw stderr:', cmWithdrawStderr)
            // console.log('Cm withdraw code:', cmWithdrawCode)

            // Assert the withdraw command succeeded
            expect(cmWithdrawCode).to.equal(0)
            expect(cmWithdrawStdout).to.include('Candy machine withdrawn successfully')
            expect(cmWithdrawStdout).to.include('Transaction hash:')

            // console.log('✅ Full candy machine lifecycle completed successfully!')

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
