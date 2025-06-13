import { Command, Flags } from '@oclif/core'

export default class ToolboxToken extends Command {
  static override description = `Token Management Tools - Create, update, and transfer tokens on Solana

The token commands provide functionality for managing SPL tokens on the Solana blockchain. These commands allow you to create new tokens, update token metadata, and transfer tokens between addresses.

Available subcommands:
  create    - Create a new token with metadata and initial supply
  update    - Update token metadata (name, symbol, image, description)
  transfer  - Transfer tokens to another address`

  static override examples = [
    '$ mplx toolbox token create --wizard',
    '$ mplx toolbox token create --name "My Token" --symbol "TOKEN" --decimals 9 --image ./logo.png --mint-amount 1000000000',
    '$ mplx toolbox token update <mint> --name "New Name" --image ./new-logo.png',
    '$ mplx toolbox token transfer <mint> <amount> <recipient>',
  ]

  static override flags = {
    help: Flags.help({char: 'h'}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(ToolboxToken)
    
    // Show help by default
    this.log(ToolboxToken.description)
    this.log('\nExamples:')
    ToolboxToken.examples.forEach(example => {
      this.log(`  ${example}`)
    })
  }
}