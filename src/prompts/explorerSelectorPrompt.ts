import { select } from '@inquirer/prompts'
import { ExplorerType } from '../explorers.js'

export interface ExplorerEndpoint {
  displayName: string
  name: ExplorerType
  url: string
}

export default async function explorerSelectorPrompt(explorers: ExplorerEndpoint[]): Promise<ExplorerEndpoint> {
  const selectedExplorer = await select<ExplorerEndpoint>({
    message: 'Select an explorer',
    choices: explorers.map(explorer => ({
      name: explorer.displayName,
      value: explorer
    }))
  })

  return selectedExplorer
}
