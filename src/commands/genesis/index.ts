import { Command } from '@oclif/core'

export default class Genesis extends Command {
  static override description = 'Genesis Program - Token launch management for TGE (Token Generation Events)'

  static override examples = [
    '<%= config.bin %> genesis create --name "My Token" --symbol "MTK" --totalSupply 1000000000',
    '<%= config.bin %> genesis fetch GenesisAddress123...',
    '<%= config.bin %> genesis deposit GenesisAddress123... --amount 1000',
    '<%= config.bin %> genesis claim GenesisAddress123...',
    '<%= config.bin %> genesis finalize GenesisAddress123...',
  ]

  public async run(): Promise<void> {
    await this.parse(Genesis)

    this.log('Genesis Program - Token launch management for TGE (Token Generation Events)')
    this.log('')
    this.log('Available commands:')
    this.log('  genesis create    Create a new Genesis account for a token launch')
    this.log('  genesis fetch     Fetch Genesis account details')
    this.log('  genesis deposit   Deposit into a launch pool')
    this.log('  genesis claim     Claim tokens from a completed launch')
    this.log('  genesis finalize  Finalize a Genesis launch')
    this.log('  genesis revoke    Revoke/cancel a Genesis launch')
    this.log('')
    this.log('Run "mplx genesis <command> --help" for more information about a command.')
  }
}
