import {Command} from '@oclif/core'

export default class Bg extends Command {
  static override description = 'Bubblegum V2 Program (Compressed NFTs)'

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
  ]

  public async run(): Promise<void> {
    this.log(`
Bubblegum V2 Program (Compressed NFTs)

Available Commands:
  tree      Manage Bubblegum trees (create, list, etc.)

Examples:
  $ mplx bg tree create --wizard    # Interactive tree creation
  $ mplx bg tree list               # List all saved trees
  $ mplx bg tree list --network mainnet

For detailed tree commands, use:
  $ mplx bg tree
`)
  }
}