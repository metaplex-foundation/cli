import {burn, burnV1, fetchAsset, fetchCollection} from '@metaplex-foundation/mpl-core'
import {Args, Flags} from '@oclif/core'

import {publicKey, TransactionBuilder, Umi} from '@metaplex-foundation/umi'
import {BaseCommand} from '../../../BaseCommand.js'
import umiSendAndConfirmTransaction from '../../../lib/umi/sendAndConfirm.js'
import ora from 'ora'
import {readFileSync} from 'node:fs'
import umiSendAllTransactionsAndConfirm from '../../../lib/umi/sendAllTransactionsAndConfirm.js'
import fs from 'node:fs'

/* 
    Options for potential list implementation:

    1. JSON file with array of strings (assetIds) to burn

        [asset1, asset2, asset3]

    2. JSON file with array of objects containg assetIds and optional collection.

        [
            {asset: asset1, collection: collection1},
            {asset: asset2, collection: collection2},
            {asset: asset3, collection: collection3},
        ]

    3. JSON file with array of objects containing strings (assetIds) and optional collection flag.

        burn --list ./assetsToBurn.json --collection collectionId

        [asset1, asset2, asset3]
*/

export default class AssetBurn extends BaseCommand<typeof AssetBurn> {
  static args = {
    asset: Args.string({description: 'Burn at single asset by mint'}),
  }

  static description = 'Burn a single Asset or a list of Assets'

  static examples = [
    '<%= config.bin %> <%= command.id %> assetId',
    '<%= config.bin %> <%= command.id %> --list ./assetsToBurn.json',
  ]

  static flags = {
    list: Flags.string({
      name: 'list',
      char: 'l',
      description: 'File path to a .json list of Assets to burn in JSON array format (e.g. [asset1, asset2])',
    }),
    collection: Flags.string({
      name: 'collection',
      char: 'c',
      description: 'Collection ID to burn Asset from',
    }),
  }

  public async run(): Promise<unknown> {
    const {args, flags} = await this.parse(AssetBurn)

    const {umi} = this.context

    if (flags.list) {
      // Burn all assets in list
      this.log('Burning assets from list')

      const assetsList = JSON.parse(readFileSync(flags.list, 'utf-8'))

      console.log(`Burning ${assetsList.length} Assets`)

      // Map through the list of assets and create a transaction for each asset

      let buildErrors: {assetId: string; error: string}[] = []

      const transactions: TransactionBuilder[] = await Promise.all(
        assetsList.map(async (asset: string) => {
          const txBuilder = await this.burnAssetTransaction(umi, asset, flags.collection).catch((error) => {
            // skipping this error for now, will be handled in the final confirmation
            buildErrors.push({assetId: asset, error: error.message})
          })
          return txBuilder
        }),
      )

      const res = await umiSendAllTransactionsAndConfirm(umi, transactions)

      //vaidate all transactions were successful

      const failedTransactions = res
        .map((transaction, index) => {
          return {
            assetId: assetsList[index] as string,
            results: transaction,
          }
        })
        .filter((transaction) => {
          return (
            !transaction.results ||
            transaction.results.transaction.err ||
            transaction.results.confirmation?.result?.value.err
          )
        })

      buildErrors.map((error) => {
        const assetId = error.assetId

        const failedIndex = failedTransactions.findIndex((transaction) => transaction.assetId === assetId)

        failedTransactions[failedIndex].results.transaction.err = error.error
      })

      console.log('Failed Transactions:', failedTransactions.length)

      if (failedTransactions.length > 0) {
        fs.writeFileSync('failedBurns.json', JSON.stringify(failedTransactions, null, 2))
      }
    } else {
      // Burn single asset
      // this.log(`${terminalColors.BgGreen}Burning single asset`)
      if (!args.asset) {
        this.error('No asset provided')
      }

      const transaction = await this.burnAssetTransaction(umi, args.asset, flags.collection)

      const transactionSpinner = ora('Burning asset...').start()
      await umiSendAndConfirmTransaction(umi, transaction)
        .then((signature) => transactionSpinner.succeed(`Asset burned: ${signature}`))
        .catch((error) => {
          transactionSpinner.fail('Failed to burn asset')
          this.error(error)
        })
    }

    return
  }

  // Reason to use burnV1 is to save an RPC calls on fetching both the Asset and the collection if collection is known.
  // For mass burns this would likely trigger a rate limit fetching both the asset and collection.

  private async burnAssetTransaction(umi: Umi, assetId: string, collectionId?: string): Promise<TransactionBuilder> {
    if (collectionId) {
      // If Collection Id is provided, burn the asset using the burnV1 method

      return burnV1(umi, {asset: publicKey(assetId), collection: publicKey(collectionId)})
    } else {
      // If Collection Id is not provided, fetch the asset and collection and burn the asset using the burn method

      const asset = await fetchAsset(umi, publicKey(assetId)).catch((error) => {})

      // TODO - handle error better
      // return burnV1 if there was an error fetching the asset
      if (!asset) {
        return burnV1(umi, {asset: publicKey(assetId)})
      }

      let collection

      if (asset.updateAuthority.type === 'Collection' && asset.updateAuthority.address) {
        collection = await fetchCollection(umi, publicKey(asset.updateAuthority.address))
      }

      return burn(umi, {asset, collection: collection})
    }
  }
}
