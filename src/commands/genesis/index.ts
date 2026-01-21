import { Command } from '@oclif/core'

export default class Genesis extends Command {
  static override description = 'MPL Genesis Program - Token launch management'

  static override examples = [
    '<%= config.bin %> genesis bucket add GenesisAddr... --type launch-pool',
    '<%= config.bin %> genesis bucket fetch GenesisAddr...',
    '<%= config.bin %> genesis bucket list GenesisAddr...',
  ]

  public async run(): Promise<void> {
    await this.parse(Genesis)

    // Display available commands
    this.log('MPL Genesis Program - Token launch management')
    this.log('')
    this.log('Available commands:')
    this.log('  genesis bucket add     Add a bucket to a Genesis Account')
    this.log('  genesis bucket fetch   Fetch bucket details')
    this.log('  genesis bucket list    List buckets in a Genesis Account')
    this.log('')
    this.log('Run "mplx genesis <command> --help" for more information about a command.')
  }
}
