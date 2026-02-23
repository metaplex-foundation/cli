import { Command } from '@oclif/core'

export default class GenesisPresale extends Command {
  static override description = 'Genesis Presale Commands - Manage presale bucket deposits and claims'

  static override examples = [
    '<%= config.bin %> genesis presale deposit GenesisAddress... --amount 1000000000',
    '<%= config.bin %> genesis presale claim GenesisAddress... --bucketIndex 0',
  ]

  public async run(): Promise<void> {
    await this.parse(GenesisPresale)

    this.log('Genesis Presale Commands - Manage presale bucket deposits and claims')
    this.log('')
    this.log('Presale buckets allow fixed-price token allocations with deposit/claim periods.')
    this.log('')
    this.log('Available commands:')
    this.log('  genesis presale deposit  Deposit into a presale bucket')
    this.log('  genesis presale claim    Claim tokens from a presale bucket')
    this.log('')
    this.log('Run "mplx genesis presale <command> --help" for more information.')
  }
}
