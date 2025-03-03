import { Command } from '@oclif/core'
import { getDefaultConfigPath, readConfig } from '../../../lib/Context.js'

import { dirname } from 'path'
import { ensureDirectoryExists, writeJsonSync } from '../../../lib/file.js'
import explorerSelectorPrompt from '../../../prompts/explorerSelectorPrompt.js'

const explorers = [
    {
        displayName: 'Solana Explorer',
        name: 'solanaExplorer',
    },
    {
        displayName: 'Solscan',
        name: 'solscan',
    },
    {
        displayName: 'Solana FM',
        name: 'solanaFm',
    },
]

export default class ConfigExplorerSetCommand extends Command {
    static override description = 'Set a new active wallet from a list of wallets'

    public async run(): Promise<void> {
        const { flags, args } = await this.parse(ConfigExplorerSetCommand)

        const path = flags.config ?? getDefaultConfigPath(this.config.configDir)

        const config = readConfig(path)

        const selectedExplorer = await explorerSelectorPrompt(explorers)

        console.log(selectedExplorer)

        config.explorer = selectedExplorer

        const dir = dirname(path)
        ensureDirectoryExists(dir)
        writeJsonSync(path, config)

        this.log(`Explorer set to ${selectedExplorer}`)
    }
}