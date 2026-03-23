import { Command } from '@oclif/core'

export default class ConfigWallets extends Command {
  static override description = 'Manage wallets in your configuration'

  static override examples = [
    '<%= config.bin %> <%= command.id %> add myWallet /path/to/keypair.json',
    '<%= config.bin %> <%= command.id %> set myWallet',
    '<%= config.bin %> <%= command.id %> list',
    '<%= config.bin %> <%= command.id %> new --name myWallet',
    '<%= config.bin %> <%= command.id %> remove myWallet',
  ]

  public async run(): Promise<void> {
    this.log(`
Wallet Management Commands:

  add     Add an existing wallet to your configuration
  list    List all configured wallets
  set     Set the active wallet
  new     Create a new wallet keypair
  remove  Remove a wallet from your configuration

Use "mplx config wallets [command] --help" for more information about a specific command.
`)
  }
}
