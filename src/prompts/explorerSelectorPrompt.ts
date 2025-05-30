import { select } from '@inquirer/prompts'

export interface ExplorerEndpoint {
  displayName: string
  name: string
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
