import { Args, Flags } from '@oclif/core'

import { TransactionBuilder } from '@metaplex-foundation/umi'
import { base58 } from '@metaplex-foundation/umi/serializers'
import { readFileSync } from 'node:fs'
import ora from 'ora'
import burnAssetTx from '../../../lib/core/burn/burnAssetTx.js'
import confirmAllTransactions, { UmiTransactionConfirmationResult } from '../../../lib/umi/confirmAllTransactions.js'
import umiSendAllTransactions from '../../../lib/umi/sendAllTransactions.js'
import umiSendAndConfirmTransaction from '../../../lib/umi/sendAndConfirm.js'
import { UmiTransactionResponce } from '../../../lib/umi/sendTransaction.js'

import fs from 'node:fs'
import { TransactionCommand } from '../../../TransactionCommand.js'

interface BurnAssetData {
  asset: string
  tx?: {
    transaction?: UmiTransactionResponce
    confirmation?: UmiTransactionConfirmationResult
  }
  err?: unknown
}

interface BurnListCache {
  name: 'burnAssetsListCache'
  collection?: string
  file: string
  items: BurnAssetData[]
}

/* 
    Options for potential list burn implementation:

    1 - Implemented. JSON file with array of strings (assetIds) to burn

        [asset1, asset2, asset3]

    2?. JSON file with array of objects containing assetIds and optional collection.
        for easier burning of assets without having to fetch collection

        [
            {asset: asset1, collection: collection1},
            {asset: asset2, collection: collection2},
            {asset: asset3, collection: collection3},
        ]

    3 - Implemented. JSON file with array of objects containing strings (assetIds) and optional collection flag.

        burn --list ./assetsToBurn.json --collection collectionId

        [asset1, asset2, asset3]
*/

export default class AssetBurn extends TransactionCommand<typeof AssetBurn> {
  static args = {
    asset: Args.string({ description: 'Burn at single asset by mint' }),
  }

  static description = 'Burn a single Asset or a list of Assets'

  static examples = [
    '<%= config.bin %> <%= command.id %> assetId',
    '<%= config.bin %> <%= command.id %> --list ./assetsToBurn.json',
  ]

  static flags = {
    list: Flags.string({
      name: 'list',
      description: 'File path to a .json list of Assets to burn in JSON array format (e.g. [asset1, asset2])',
    }),
    collection: Flags.string({
      name: 'collection',
      description: 'Collection ID to burn Asset from',
    }),
  }

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(AssetBurn)

    const { umi, explorer } = this.context

    if (flags.list) {
      // Burn all assets in list

      const disabled = true

      if (disabled) {
        this.log('Burning Assets from list coming soon')
        return
      }

      this.log('Burning assets from list')

      const assetsList: string[] = JSON.parse(readFileSync(flags.list, 'utf-8'))

      let cache: BurnListCache = {
        name: 'burnAssetsListCache',
        file: flags.list,
        items: assetsList.map((asset: string) => ({ asset: asset, tx: {} })),
      }

      const transactions: (TransactionBuilder | null)[] = await Promise.all(
        assetsList.map(async (asset: string, index: number) => {
          const txBuilder = await burnAssetTx(umi, asset, flags.collection).catch((error) => {
            cache.items[index].err = error
            return null
          })
          return txBuilder
        }),
      )

      const currentDirectory = process.cwd()

      const startTime = Date.now()

      const sendRes = await umiSendAllTransactions(umi, transactions, undefined, (index, response) => {
        cache.items[index].tx = {
          ...cache.items[index].tx,
          transaction: {
            ...response,
            signature: response.signature ? base58.deserialize(response.signature as Uint8Array)[0] : null
          }
        }

        console.log({ cacheItem: cache.items[index].tx })
        fs.writeFileSync(currentDirectory + '/burn-cache.json', JSON.stringify(cache, null, 2))
        return response
      })

      await confirmAllTransactions(umi, cache.items.map((item) => item.tx?.transaction), undefined, (index, response) => {
        cache.items[index].tx = {
          ...cache.items[index].tx,
          confirmation: response
        }

        console.log({ cacheItem: cache.items[index].tx })
        fs.writeFileSync(currentDirectory + '/burn-cache.json', JSON.stringify(cache, null, 2))
      })

      const failedTransactions = cache.items.filter((item) => item.tx?.transaction?.err || !item.tx?.confirmation?.confirmed)

      if (failedTransactions.length > 0) {
        this.error(`All transactions did not confirm successfully, please check the cache file for more details\n
          Failed transactions: ${failedTransactions.length} of ${assetsList.length}\n
          Failed transactions: ${failedTransactions.map((item) => item.asset).join(', ')}\n
          Cache file: ${currentDirectory}/burn-cache.json
          `)
      } else {
        this.logSuccess(`--------------------------------
  Assets burned: ${cache.items.length} of ${assetsList.length}
  Cache file: ${currentDirectory}/burn-cache.json
--------------------------------`)
      }
    } else {
      // Burn single asset
      if (!args.asset) {
        this.error('No asset provided')
      }

      const transactionSpinner = ora('Burning asset...').start()
      const burnTx = await burnAssetTx(umi, args.asset, flags.collection)

      if (!burnTx) {
        transactionSpinner.fail('Failed to build transaction')
        this.error('Failed to build transaction')
        return
      }

      const result = await umiSendAndConfirmTransaction(umi, burnTx)

      if (result.transaction.err) {
        transactionSpinner.fail('Failed to burn asset')
        this.error(result.transaction.err)
      } else {
        const signature = base58.deserialize(result.transaction.signature! as Uint8Array)[0]
        transactionSpinner.succeed(`Asset burned: ${args.asset}`)
        this.logSuccess(`--------------------------------
  Asset burned: ${args.asset}
  Signature: ${signature}
--------------------------------`)
      }
    }

    return
  }
}

