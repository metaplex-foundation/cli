import { Command } from '@oclif/core'
import { getDefaultConfigPath, readConfig } from '../../../lib/Context.js'
import { storageProviders } from '../../../lib/uploader/uploadProviders/index.js'
import { select } from '@inquirer/prompts'
import { dirname } from 'node:path'
import { ensureDirectoryExists, writeJsonSync } from '../../../lib/file.js'


export default class ConfigStorageSet extends Command {
    static override description = 'Set a new active storage provider from a list of storage providers'

    public async run(): Promise<void> {
        const { flags, args } = await this.parse(ConfigStorageSet)
        const path = flags.config ?? getDefaultConfigPath()

        const config = readConfig(path)

        const storageProvidersList = Object.values(storageProviders)

        const selectedStorage = await select({
            message: 'Select a storage provider',
            choices: storageProvidersList.map(storageProvider => ({
                name: storageProvider.name,
                value: storageProvider.name
            }))
        })

        config.storage = {
            name: selectedStorage,
            options: {}
        }

        const dir = dirname(path)
        ensureDirectoryExists(dir)
        writeJsonSync(path, config)

        this.log(`Configuration updated: ${path}`)
    }
}