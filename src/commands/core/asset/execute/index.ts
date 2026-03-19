import { Command } from '@oclif/core'

export default class CoreAssetExecute extends Command {
  static override description = 'Execute instructions signed by an MPL Core Asset\'s signer PDA'

  static override examples = [
    '<%= config.bin %> core asset execute info <assetId>',
  ]

  public async run(): Promise<void> {
    await this.parse(CoreAssetExecute)
  }
}
