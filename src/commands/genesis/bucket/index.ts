import { Command } from '@oclif/core'

export default class GenesisBucket extends Command {
  static override description = 'Manage buckets in a Genesis Account'

  static override examples = [
    '<%= config.bin %> genesis bucket add GenesisAddr... --type launch-pool',
    '<%= config.bin %> genesis bucket fetch GenesisAddr... BucketAddr...',
    '<%= config.bin %> genesis bucket list GenesisAddr...',
  ]

  public async run(): Promise<void> {
    await this.parse(GenesisBucket)

    // Display available commands
    this.log('Manage buckets in a Genesis Account')
    this.log('')
    this.log('Available commands:')
    this.log('  genesis bucket add     Add a new bucket (launch-pool or unlocked)')
    this.log('  genesis bucket fetch   Fetch details of a specific bucket')
    this.log('  genesis bucket list    List all buckets in a Genesis Account')
    this.log('')
    this.log('Bucket Types:')
    this.log('  launch-pool  Collects deposits during a window and distributes tokens proportionally')
    this.log('  unlocked     Destination bucket for forwarded SOL from launch pools')
    this.log('')
    this.log('Run "mplx genesis bucket <command> --help" for more information.')
  }
}
