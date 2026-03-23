import { Command } from '@oclif/core'

export default class ConfigRpcs extends Command {
  static override description = 'Manage RPC endpoints in your configuration'

  static override examples = [
    '<%= config.bin %> <%= command.id %> add myRpc https://api.devnet.solana.com',
    '<%= config.bin %> <%= command.id %> set myRpc',
    '<%= config.bin %> <%= command.id %> list',
    '<%= config.bin %> <%= command.id %> remove myRpc',
  ]

  public async run(): Promise<void> {
    this.log(`
RPC Management Commands:

  add     Add a new RPC endpoint to your configuration
  list    List all configured RPC endpoints
  set     Set the active RPC endpoint
  remove  Remove an RPC endpoint from your configuration

Use "mplx config rpcs [command] --help" for more information about a specific command.
`)
  }
}
