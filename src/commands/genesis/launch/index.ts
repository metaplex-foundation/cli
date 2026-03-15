import { Command } from '@oclif/core'

export default class GenesisLaunch extends Command {
  static override description = 'Genesis Launch Commands - Create and register token launches via the Genesis API'

  static override examples = [
    '<%= config.bin %> genesis launch create --name "My Token" --symbol "MTK" --image "https://gateway.irys.xyz/..." --tokenAllocation 500000000 --depositStartTime 2025-03-01T00:00:00Z --raiseGoal 200 --raydiumLiquidityBps 5000 --fundsRecipient <ADDRESS>',
    '<%= config.bin %> genesis launch register <GENESIS_ACCOUNT>',
  ]

  public async run(): Promise<void> {
    await this.parse(GenesisLaunch)
  }
}
