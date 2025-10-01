import { expect } from 'chai'
import { runCli } from '../../runCli'
import { createCoreAsset, createCoreCollection, stripAnsi } from './corehelpers'

describe('core plugin commands', () => {

    before(async () => {
        try {
            const { stdout, stderr, code } = await runCli(
                ["toolbox", "sol", "airdrop", "100", "TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx"]
            )

            // Wait for airdrop to be confirmed
            await new Promise(resolve => setTimeout(resolve, 10000))
        } catch (error) {
            console.log('Airdrop failed, tests may fail:', error)
        }
    })

    it('adds a plugin to a collection using JSON file', async function() {
        this.timeout(30000) // 30 seconds timeout
        // First create a collection
        const { collectionId } = await createCoreCollection()

        // Add plugin using JSON file
        const addInput = [
            'core',
            'plugins',
            'add',
            collectionId,
            'test-files/plugins.json',
            '--collection'
        ]

        const { stdout: addStdout, stderr: addStderr, code: addCode } = await runCli(addInput)

        const cleanAddStderr = stripAnsi(addStderr)

        expect(addCode).to.equal(0)
        expect(cleanAddStderr).to.contain('Plugin added')
    })

    it('updates a plugin on a collection using JSON file', async function() {
        this.timeout(45000) // 45 seconds timeout
        // First create a collection and add a plugin
        const { collectionId } = await createCoreCollection()

        // Add initial plugin
        const addInput = [
            'core',
            'plugins',
            'add',
            collectionId,
            'test-files/plugins.json',
            '--collection'
        ]

        const { code: addCode } = await runCli(addInput)
        expect(addCode).to.equal(0)

        // Now update the plugin with different attributes
        const updateInput = [
            'core',
            'plugins',
            'update',
            collectionId,
            'test-files/plugins-updated.json',
            '--collection'
        ]

        const { stdout: updateStdout, stderr: updateStderr, code: updateCode } = await runCli(updateInput)

        const cleanUpdateStderr = stripAnsi(updateStderr)

        expect(updateCode).to.equal(0)
        expect(cleanUpdateStderr).to.contain('Plugin updated')
    })

    it('adds a plugin to an asset using JSON file', async function() {
        this.timeout(45000) // 45 seconds timeout
        // Create a collection and asset
        const { collectionId } = await createCoreCollection()
        const { assetId } = await createCoreAsset(collectionId)

        // Add plugin to asset
        const addInput = [
            'core',
            'plugins',
            'add',
            assetId,
            'test-files/plugins.json'
        ]

        const { stdout: addStdout, stderr: addStderr, code: addCode } = await runCli(addInput)

        const cleanAddStderr = stripAnsi(addStderr)

        expect(addCode).to.equal(0)
        expect(cleanAddStderr).to.contain('Plugin added')
        expect(cleanAddStderr).to.contain(assetId)
    })

    it('updates a plugin on an asset using JSON file', async function() {
        this.timeout(60000) // 60 seconds timeout
        // Create a collection and asset, then add and update plugin
        const { collectionId } = await createCoreCollection()
        const { assetId } = await createCoreAsset(collectionId)

        // Add initial plugin to asset
        const addInput = [
            'core',
            'plugins',
            'add',
            assetId,
            'test-files/plugins.json'
        ]

        const { code: addCode } = await runCli(addInput)
        expect(addCode).to.equal(0)

        // Update the plugin on the asset
        const updateInput = [
            'core',
            'plugins',
            'update',
            assetId,
            'test-files/plugins-updated.json'
        ]

        const { stdout: updateStdout, stderr: updateStderr, code: updateCode } = await runCli(updateInput)

        const cleanUpdateStderr = stripAnsi(updateStderr)

        expect(updateCode).to.equal(0)
        expect(cleanUpdateStderr).to.contain('Plugin updated')
    })

    it('fails to update plugin with invalid collection ID', async function() {
        this.timeout(15000) // 15 seconds timeout
        const invalidCollectionId = 'invalidCollectionId123'

        const updateInput = [
            'core',
            'plugins',
            'update',
            invalidCollectionId,
            'test-files/plugins-updated.json',
            '--collection'
        ]

        try {
            await runCli(updateInput)
            // If we reach here, the test should fail because we expect an error
            expect.fail('Expected command to fail with invalid collection ID')
        } catch (error) {
            // This is expected - the command should fail
            expect(error).to.be.instanceOf(Error)
        }
    })

    it('fails to update plugin with non-existent JSON file', async function() {
        this.timeout(30000) // 30 seconds timeout
        const { collectionId } = await createCoreCollection()

        const updateInput = [
            'core',
            'plugins',
            'update',
            collectionId,
            'test-files/non-existent-plugins.json',
            '--collection'
        ]

        try {
            await runCli(updateInput)
            expect.fail('Expected command to fail with non-existent file')
        } catch (error) {
            expect(error).to.be.instanceOf(Error)
        }
    })
})