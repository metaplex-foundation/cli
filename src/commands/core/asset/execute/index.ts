import { Command } from '@oclif/core'

export default class CoreAssetExecute extends Command {
  static override description = 'Execute instructions signed by an MPL Core Asset\'s signer PDA'

  static override examples = [
    '<%= config.bin %> core asset execute signer <assetId>',
    '<%= config.bin %> core asset execute transfer-sol <assetId> --amount 0.5 --destination <address>',
    '<%= config.bin %> core asset execute transfer-token <assetId> --mint <mint> --amount 1000 --destination <address>',
    '<%= config.bin %> core asset execute transfer-asset <assetId> --asset <targetAssetId> --new-owner <address>',
    '<%= config.bin %> core asset execute raw <assetId> --instruction <base64>',
  ]

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(CoreAssetExecute)
  }
}
