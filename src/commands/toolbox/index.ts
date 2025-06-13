import {Args, Command, Flags} from '@oclif/core'

export default class Toolbox extends Command {
  static override description = `Solana Ecosystem Tools - Utility commands for common Solana operations

The toolbox commands provide utility functions for common Solana blockchain operations, including SOL management and token operations.

Available subcommands:
  sol     - SOL management tools (balance, transfer, airdrop)
  token   - Token management tools (create, update, transfer)
  rent    - Calculate rent costs for on-chain data storage`

  static override examples = [
    '$ mplx toolbox sol balance',
    '$ mplx toolbox sol transfer 1 <recipient_address>',
    '$ mplx toolbox token create --wizard',
    '$ mplx toolbox rent 1000',
  ]

  static override flags = {
    help: Flags.help({char: 'h'}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(Toolbox)
    
    // Show help by default
    this.log(Toolbox.description)
    this.log('\nExamples:')
    Toolbox.examples.forEach(example => {
      this.log(`  ${example}`)
    })
  }
}