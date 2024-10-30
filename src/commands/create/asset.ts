import {Args, Command, Flags} from '@oclif/core'
import { BaseCommand } from '../../BaseCommand.js'
import { create } from '@metaplex-foundation/mpl-core'
import { generateSigner } from '@metaplex-foundation/umi'
import { txSignatureToString } from '../../lib/util.js'

export default class Asset extends BaseCommand<typeof Asset> {
  static override description = 'Create an asset'

  static override examples = [
    ...super.baseExamples,
    '<%= config.bin %> <%= command.id %> -n "Cool Asset" -u "https://example.com/metadata.json"',
  ]

  static override flags = {
    name: Flags.string({char: 'n', description: 'Asset name', required: true}),
    uri: Flags.string({char: 'u', description: 'Asset metadata URI', required: true}),
    standard: Flags.string({char: 's', description: 'Asset standard', options: ['core'], default: 'core'}),
  }

  public async run(): Promise<any> {
    const {args, flags} = await this.parse(Asset)
    const { name, uri, standard } = flags

    const { umi } = this.context

    // TODO create different assets types

    if (standard === 'core') {
      const asset = generateSigner(umi)
      const result = await create(umi, {
        asset,
        name,
        uri,
      }).sendAndConfirm(umi)
      const txStr = txSignatureToString(result.signature)
      this.logSuccess(`Asset ${asset.publicKey} created: ${txStr}`)
      return {
        asset,
        tx: txStr
      }
    }
  }
}
