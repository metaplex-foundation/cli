import { Args, Flags } from '@oclif/core'

import { readFileSync } from 'node:fs'
import ora from 'ora'
import { BaseCommand } from '../../../BaseCommand.js'
import burnBatch from '../../../lib/core/burn/batchBurn.js'
import burnAsset from '../../../lib/core/burn/burnAsset.js'

/* 
    Options for potential list burn implementation:

    1?. JSON file with array of strings (assetIds) to burn

        [asset1, asset2, asset3]

    2?. JSON file with array of objects containing assetIds and optional collection.
        for easier burning of assets without having to fetch collection

        [
            {asset: asset1, collection: collection1},
            {asset: asset2, collection: collection2},
            {asset: asset3, collection: collection3},
        ]

    3?. JSON file with array of objects containing strings (assetIds) and optional collection flag.

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

      const assetsList: string[] = JSON.parse(readFileSync(flags.list, 'utf-8'))

      await burnBatch(umi, assetsList, flags.collection)
    } else {
      // Burn single asset
      if (!args.asset) {
        this.error('No asset provided')
      }

      const transactionSpinner = ora('Burning asset...').start()
      await burnAsset(umi, args.asset, flags.collection)
        .then((signature) => transactionSpinner.succeed(`Asset burned: ${signature}`))
        .catch((error) => {
          transactionSpinner.fail('Failed to burn asset')
          this.error(error)
        })
    }

    return
  }
}
