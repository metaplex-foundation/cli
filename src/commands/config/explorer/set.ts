import { Command } from '@oclif/core'
import { getDefaultConfigPath, readConfig } from '../../../lib/Context.js'

import { dirname } from 'path'
import { ensureDirectoryExists, writeJsonSync } from '../../../lib/file.js'
import explorerSelectorPrompt, { ExplorerEndpoint } from '../../../prompts/explorerSelectorPrompt.js'
import { ExplorerType } from '../../../explorers.js'

const explorers: ExplorerEndpoint[] = [
    {
        displayName: 'Solana Explorer',
        name: 'solanaExplorer',
        url: 'https://explorer.solana.com'
    },
    {
        displayName: 'Solscan',
        name: 'solscan',
        url: 'https://solscan.io'
    },
    {
        displayName: 'Solana FM',
        name: 'solanaFm',
        url: 'https://solana.fm'
    },
]

export default class ConfigExplorerSetCommand extends Command {
    static override description = 'Set the preferred blockchain explorer'

    public async run(): Promise<void> {
        const { flags, args } = await this.parse(ConfigExplorerSetCommand)
        const path = flags.config ?? getDefaultConfigPath()
        const config = readConfig(path)

        const selectedExplorer = await explorerSelectorPrompt(explorers)
        config.explorer = selectedExplorer.name as ExplorerType

        const dir = dirname(path)
        ensureDirectoryExists(dir)
        writeJsonSync(path, config)

        this.log(`Explorer set to ${selectedExplorer.displayName}`)
    }
}