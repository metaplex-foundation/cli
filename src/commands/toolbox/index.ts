import { Command } from '@oclif/core'

export default class Toolbox extends Command {
  static override description = 'Various tools for the Solana ecosystem'

  static override examples = [
    '<%= config.bin %> <%= command.id %> sol balance',
    '<%= config.bin %> <%= command.id %> sol transfer 1 <destination>',
    '<%= config.bin %> <%= command.id %> token create --wizard',
    '<%= config.bin %> <%= command.id %> transaction --instruction <base64>',
  ]

  public async run(): Promise<void> {
    this.log(`
Toolbox Commands:

  sol          SOL operations (balance, transfer, airdrop, wrap, unwrap)
  token        SPL Token tools (create, mint, transfer, update, add-metadata)
  storage      Storage provider management (fund, balance, withdraw, upload)
  lut          Address Lookup Table management (create, fetch, deactivate, close)
  template     Download starter templates (program, website)
  transaction  Execute arbitrary base64-encoded Solana instructions
  rent         Calculate rent cost for a given number of bytes

Use "mplx toolbox [command] --help" for more information about a specific command.
`)
  }
}