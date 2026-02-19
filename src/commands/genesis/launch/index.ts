import { Command } from '@oclif/core'

export default class GenesisLaunch extends Command {
  static override description = 'Genesis Launch Commands - Create and manage token launches via the Genesis API'

  static override examples = [
    '<%= config.bin %> genesis launch create --name "My Token" --symbol "MTK" --image "https://gateway.irys.xyz/..." --token-allocation 500000000 --deposit-start-time "2026-03-01T00:00:00Z" --raise-goal 200 --raydium-liquidity-bps 5000 --funds-recipient RecipientWallet...',
  ]

  public async run(): Promise<void> {
    await this.parse(GenesisLaunch)

    this.log('Genesis Launch Commands - Create and manage token launches via the Genesis API')
    this.log('')
    this.log('Available commands:')
    this.log('  genesis launch create   Create a new project launch via the Genesis API')
    this.log('')
    this.log('Run "mplx genesis launch <command> --help" for more information.')
  }
}
