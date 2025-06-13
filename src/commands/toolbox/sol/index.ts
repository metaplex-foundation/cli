import { Command, Flags } from '@oclif/core'

export default class ToolboxSol extends Command {
  static override description = `SOL Management Tools - Manage SOL balances and transfers

The SOL commands provide utility functions for managing SOL on the Solana blockchain, including checking balances, transferring SOL, and airdropping SOL on devnet.

Available subcommands:
  balance  - Check SOL balance of an address (or current wallet)
  transfer - Transfer SOL to another address
  airdrop  - Airdrop SOL to an address (devnet only)`

  static override examples = [
    '$ mplx toolbox sol balance',
    '$ mplx toolbox sol balance <address>',
    '$ mplx toolbox sol transfer 1 <recipient_address>',
    '$ mplx toolbox sol airdrop 1 <address>',
  ]

  static override flags = {
    help: Flags.help({char: 'h'}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(ToolboxSol)
    
    // Show help by default
    this.log(ToolboxSol.description)
    this.log('\nExamples:')
    ToolboxSol.examples.forEach(example => {
      this.log(`  ${example}`)
    })
  }
}