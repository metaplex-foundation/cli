import { baseUpdateAuthority, fetchAsset, fetchCollection, update } from '@metaplex-foundation/mpl-core'
import { publicKey } from '@metaplex-foundation/umi'
import { Args } from '@oclif/core'
import ora from 'ora'

import { generateExplorerUrl } from '../../../explorers.js'
import { TransactionCommand } from '../../../TransactionCommand.js'
import umiSendAndConfirmTransaction from '../../../lib/umi/sendAndConfirm.js'
import { txSignatureToString } from '../../../lib/util.js'

export default class CollectionAdd extends TransactionCommand<typeof CollectionAdd> {
  static override description = 'Add an existing MPL Core Asset to a Collection'

  static override examples = [
    '<%= config.bin %> <%= command.id %> <collection> <asset>',
  ]

  static override args = {
    collection: Args.string({ description: 'Collection to add the asset to', required: true }),
    asset: Args.string({ description: 'Asset to add to the collection', required: true }),
  }

  public async run(): Promise<unknown> {
    const { args } = await this.parse(CollectionAdd)
    const { umi, explorer, chain } = this.context

    const spinner = ora('Fetching asset and collection...').start()

    try {
      const asset = await fetchAsset(umi, publicKey(args.asset))
      const collection = await fetchCollection(umi, publicKey(args.collection))

      if (asset.updateAuthority.type === 'Collection') {
        spinner.fail('Asset is already in a collection')
        this.error(`Asset ${args.asset} already belongs to collection ${asset.updateAuthority.address}`)
      }

      spinner.text = 'Adding asset to collection...'

      const txBuilder = update(umi, {
        asset,
        newUpdateAuthority: baseUpdateAuthority('Collection', [collection.publicKey]),
        newCollection: collection.publicKey,
      })

      const result = await umiSendAndConfirmTransaction(umi, txBuilder)
      const signature = txSignatureToString(result.transaction.signature as Uint8Array)
      const explorerUrl = generateExplorerUrl(explorer, chain, signature, 'transaction')

      spinner.succeed(`Asset added to collection`)
      this.logSuccess(`--------------------------------
  Asset:      ${args.asset}
  Collection: ${args.collection}
  Signature:  ${signature}
  Explorer:   ${explorerUrl}
--------------------------------`)

      return {
        asset: args.asset,
        collection: args.collection,
        signature,
        explorer: explorerUrl,
      }
    } catch (error) {
      if (!spinner.isSpinning) throw error
      spinner.fail('Failed to add asset to collection')
      throw error
    }
  }
}
