import { Command } from '@oclif/core'

export default class GenesisLaunch extends Command {
  static override description = 'Genesis Launch Commands - Create and register token launches via the Genesis API'

  static override examples = [
    '<%= config.bin %> genesis launch create --name "My Token" --symbol "MTK" --image "https://gateway.irys.xyz/..." --tokenAllocation 500000000 --depositStartTime 2025-03-01T00:00:00Z --raiseGoal 200 --raydiumLiquidityBps 5000 --fundsRecipient <ADDRESS>',
    '<%= config.bin %> genesis launch register <GENESIS_ACCOUNT>',
  ]

  public async run(): Promise<void> {
    await this.parse(GenesisLaunch)

    this.log('Genesis Launch Commands - Create and register token launches via the Genesis API')
    this.log('')
    this.log('The Genesis API provides an all-in-one flow for creating token launches:')
    this.log('  1. Builds the on-chain transactions (genesis account, buckets, etc.)')
    this.log('  2. Signs and sends them to the network')
    this.log('  3. Registers the launch on the Metaplex platform')
    this.log('')
    this.log('Available commands:')
    this.log('  genesis launch create    Create a new token launch via the Genesis API')
    this.log('  genesis launch register  Register an existing genesis account')
    this.log('')
    this.log('Run "mplx genesis launch <command> --help" for more information.')
  }
}
