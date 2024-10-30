import {Args, Command, Flags} from '@oclif/core'
import { BaseCommand } from '../../BaseCommand.js'
import { create, fetchAsset } from '@metaplex-foundation/mpl-core'
import { generateSigner } from '@metaplex-foundation/umi'
import { jsonStringify, txSignatureToString } from '../../lib/util.js'

export default class Asset extends BaseCommand<typeof Asset> {
  static override description = 'Fetch an asset by mint'

  static override args = {
    asset: Args.string({description: 'Asset pubkey (mint) to fetch', required: true}),
  }

  static override examples = [
    ...super.baseExamples,
    '<%= config.bin %> <%= command.id %> HaKyubAWuTS9AZkpUHtFkTKAHs1KKAJ3onZPmaP9zBpe',
  ]

  static override flags = {

  }

  public async run(): Promise<any> {
    const {args, flags} = await this.parse(Asset)
    const { asset: pubkey } = args

    const { umi } = this.context
    const asset = await fetchAsset(umi, pubkey)

    this.log(jsonStringify(asset, 2))
    return asset
  }
}
