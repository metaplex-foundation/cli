import { exec } from 'child_process'
import { runCli } from '../../runCli'
import { promisify } from 'util'
import { createCoreCollection } from '../core/corehelpers'
import { expect } from 'chai'
import fs from 'fs'

const execAsync = promisify(exec)

describe('cm insert commands', () => {
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
        const cmName = "testCm2"
        
        try {
            const { collectionId } = await createCoreCollection()

            // console.log('Creating test candy machine directory')
            // Await the directory creation
            await execAsync("npm run create-test-cm -- --name=" + cmName + " --with-config --collection=" + collectionId + " --with-assets --uploaded")

            const { stdout: cmCreateStdout, stderr: cmCreateStderr, code: cmCreateCode } = await runCli(
                ["cm", "create", "./" + cmName]
            )
            // console.log('Cm create stdout:', cmCreateStdout)
            // console.log('Cm create stderr:', cmCreateStderr)
            // console.log('Cm create code:', cmCreateCode)

            // Assert candy machine creation succeeded
            expect(cmCreateCode).to.equal(0)
            expect(cmCreateStdout).to.include('Tx confirmed')
            expect(cmCreateStderr).to.include('Candy machine created')

            const { stdout, stderr, code } = await runCli(
                ["cm", "insert", "./" + cmName]
            )

            // console.log('Cm insert stdout:', stdout)
            // console.log('Cm insert stderr:', stderr)
            // console.log('Cm insert code:', code)

            // Assert the insert command succeeded
            expect(code).to.equal(0)
            expect(stdout).to.include('Asset cache updated successfully')
            expect(stderr).to.include('Sent')
            expect(stderr).to.include('Confirmed')
            expect(stderr).to.include('transactions')

            // Verify the asset cache file exists and was modified
            const cachePath = `./${cmName}/asset-cache.json`
            expect(fs.existsSync(cachePath)).to.be.true

            // Optional: Check that some assets were marked as loaded
            const cacheContent = JSON.parse(fs.readFileSync(cachePath, 'utf-8'))
            const loadedAssets = Object.values(cacheContent.assetItems).filter((asset: any) => asset.loaded === true)
            expect(loadedAssets.length).to.be.greaterThan(0)
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