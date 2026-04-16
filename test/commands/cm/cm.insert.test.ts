import { exec } from 'node:child_process'
import { runCli } from '../../runCli'
import { promisify } from 'node:util'
import { createCoreCollection } from '../core/corehelpers'
import { expect } from 'chai'
import fs from 'node:fs'

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
            await execAsync(`npm run create-test-cm -- --name=${cmName} --with-config --collection=${collectionId} --with-assets --uploaded`)

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
                ["cm", "insert", `./${cmName}`]
            )

            // console.log('Cm insert stdout:', stdout)
            // console.log('Cm insert stderr:', stderr)
            // console.log('Cm insert code:', code)

            // Assert the insert command succeeded
            expect(code).to.equal(0)
            expect(stdout).to.include('All 50 items inserted successfully')
            expect(stdout).to.not.include('failed to insert')
            expect(stderr).to.include('Processed')
            expect(stderr).to.include('transactions')

            // Verify the asset cache file exists and was modified
            const cachePath = `./${cmName}/asset-cache.json`
            expect(fs.existsSync(cachePath)).to.be.true

            // Check that all assets were marked as loaded
            const cacheContent = JSON.parse(fs.readFileSync(cachePath, 'utf-8'))
            const loadedAssets = Object.values(cacheContent.assetItems).filter((asset: any) => asset.loaded === true)
            expect(loadedAssets.length).to.equal(Object.keys(cacheContent.assetItems).length)
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

    it('reports warning when some items fail to insert', async () => {
        const cmName = "testCmInsertWarning"

        try {
            const { collectionId } = await createCoreCollection()

            await execAsync(`npm run create-test-cm -- --name=${cmName} --with-config --collection=${collectionId} --with-assets --uploaded --assets=5`)

            // Create candy machine
            const { code: cmCreateCode } = await runCli(["cm", "create", `./${cmName}`])
            expect(cmCreateCode).to.equal(0)

            // First insert — all items succeed
            const { code: insertCode1 } = await runCli(["cm", "insert", `./${cmName}`])
            expect(insertCode1).to.equal(0)

            const cachePath = `./${cmName}/asset-cache.json`
            const configPath = `./${cmName}/cm-config.json`
            const cache = JSON.parse(fs.readFileSync(cachePath, 'utf-8'))
            const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))

            // Reset 2 items to unloaded and point to an invalid candy machine
            // so the retry transactions fail
            cache.assetItems[0].loaded = false
            cache.assetItems[1].loaded = false
            fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2))

            const originalCmId = config.candyMachineId
            config.candyMachineId = '11111111111111111111111111111111'
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

            // Re-run insert — should fail to insert the 2 unloaded items
            // and report a warning
            let stdout = ''
            try {
                const result = await runCli(["cm", "insert", `./${cmName}`])
                stdout = result.stdout
            } catch (error) {
                // The command may exit non-zero if transactions fail,
                // but the output should still contain the warning
                stdout = (error as Error).message || ''
            }

            expect(stdout).to.include('failed to insert')
            expect(stdout).to.include('retry')

            // Restore original config
            config.candyMachineId = originalCmId
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
        } finally {
            try {
                await execAsync(`rm -rf ./${cmName}`)
            } catch { /* ignore */ }
        }
    })

    it('resumes insertion after simulated partial failure', async () => {
        const cmName = "testCmResume"

        try {
            const { collectionId } = await createCoreCollection()

            await execAsync(`npm run create-test-cm -- --name=${cmName} --with-config --collection=${collectionId} --with-assets --uploaded --assets=10`)

            // Create candy machine
            const { code: cmCreateCode } = await runCli(["cm", "create", `./${cmName}`])
            expect(cmCreateCode).to.equal(0)

            // First insert — all items
            const { code: insertCode1 } = await runCli(["cm", "insert", `./${cmName}`])
            expect(insertCode1).to.equal(0)

            const cachePath = `./${cmName}/asset-cache.json`
            const cache = JSON.parse(fs.readFileSync(cachePath, 'utf-8'))

            // Verify all loaded
            const allLoaded = Object.values(cache.assetItems).every((item: any) => item.loaded === true)
            expect(allLoaded).to.be.true

            // Simulate partial failure: reset one item at the beginning, middle, and end
            const itemKeys = Object.keys(cache.assetItems).sort((a, b) => Number(a) - Number(b))
            const resetKeys = [
                itemKeys[0],
                itemKeys[Math.floor(itemKeys.length / 2)],
                itemKeys[itemKeys.length - 1],
            ]
            for (const key of resetKeys) {
                cache.assetItems[key].loaded = false
            }
            fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2))

            // Re-run insert — should only process the 3 unloaded items
            const { stdout, stderr, code: insertCode2 } = await runCli(["cm", "insert", `./${cmName}`])
            expect(insertCode2).to.equal(0)
            expect(stdout).to.include('items inserted successfully')

            // Verify at most 3 transactions (one per unloaded item, possibly packed into fewer)
            const resumeTxMatch = stderr.match(/Processed (\d+) transactions/)
            expect(resumeTxMatch).to.not.be.null
            expect(Number(resumeTxMatch![1])).to.be.lessThanOrEqual(3)

            // Verify all items are now loaded again
            const cacheAfter = JSON.parse(fs.readFileSync(cachePath, 'utf-8'))
            const allLoadedAfter = Object.values(cacheAfter.assetItems).every((item: any) => item.loaded === true)
            expect(allLoadedAfter).to.be.true
        } finally {
            try {
                await execAsync(`rm -rf ./${cmName}`)
            } catch (cleanupError) {
                // ignore
            }
        }
    })
})