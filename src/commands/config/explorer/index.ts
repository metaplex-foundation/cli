import { Command } from '@oclif/core'

export default class ConfigExplorer extends Command {
  static override description = 'Manage the preferred blockchain explorer'

  static override examples = [
    '<%= config.bin %> <%= command.id %> set',
  ]

  public async run(): Promise<void> {
    this.log(`
Explorer Commands:

  set  Set the preferred blockchain explorer (Solana Explorer, Solscan, Solana FM)

Use "mplx config explorer set --help" for more information.
`)
  }
}
