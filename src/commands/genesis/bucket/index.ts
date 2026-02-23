import { Command } from '@oclif/core'

export default class GenesisBucket extends Command {
  static override description = 'Manage Genesis buckets - allocation mechanisms for token launches'

  static override examples = [
    '<%= config.bin %> genesis bucket add-launch-pool GenesisAddress... --allocation 500000000',
    '<%= config.bin %> genesis bucket fetch GenesisAddress... --bucketIndex 0',
  ]

  public async run(): Promise<void> {
    await this.parse(GenesisBucket)

    this.log('Genesis Bucket Commands - Manage allocation mechanisms for token launches')
    this.log('')
    this.log('Bucket Types:')
    this.log('  Launch Pool   - Pro-rata allocation based on contributions')
    this.log('  Auction       - Bid-based price discovery')
    this.log('  Presale       - Whitelist-based allocations')
    this.log('  Vault         - Token storage with conditions')
    this.log('  Bonding Curve - Dynamic pricing based on supply')
    this.log('')
    this.log('Available commands:')
    this.log('  genesis bucket add-launch-pool  Add a launch pool bucket')
    this.log('  genesis bucket add-presale      Add a presale bucket')
    this.log('  genesis bucket add-unlocked     Add an unlocked (treasury) bucket')
    this.log('  genesis bucket fetch            Fetch bucket details')
    this.log('')
    this.log('Run "mplx genesis bucket <command> --help" for more information.')
  }
}
