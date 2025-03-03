import { Args, Flags } from '@oclif/core'

import fs from 'node:fs'
import batchFetchCoreAssets from '../../../lib/core/fetch/batchFetch.js'
import fetchCoreAsset from '../../../lib/core/fetch/fetch.js'
import { TransactionCommand } from '../../../TransactionCommand.js'

/* 
  Fetch Possibilities:

  1. Fetch a single Asset by providing the Asset ID and display the metadata.

  TODO
  2. Fetch a single Asset by providing the Asset ID and download the metadata and image to disk.

  TODO
  3. Fetch multiple Assets by providing multiple Asset IDs from a .txt/.csv/json file and save metadata and image to disk (original or DAS format).
*/

export default class AssetFetch extends TransactionCommand<typeof AssetFetch> {
  static description = 'Fetch an asset by mint'

  static examples = [
    '<%= config.bin %> <%= command.id %> <assetId>',
    '<%= config.bin %> <%= command.id %> <assetId> --output ./assets',
  ]

  static flags = {
    assetList: Flags.file({ name: 'assetList', description: 'A file containing a list of asset IDs to fetch' }),
    output: Flags.string({
      name: 'output',
      description: 'Output directory of the downloaded asset(s)',
    }),
    image: Flags.boolean({
      name: 'image',
      description: 'Download the image file',
    }),
    metadata: Flags.boolean({
      name: 'metadata',
      description: 'Download the offchain metadata file',
    }),
  }

  static args = {
    asset: Args.string({ name: 'asset', description: 'The asset ID to fetch' }),
  }

  public async run() {
    const { args, flags } = await this.parse(AssetFetch)

    const { umi } = this.context


    if (args.asset) {
      // fetch a single asset
      await fetchCoreAsset(umi, args.asset, { outputPath: flags.output, image: flags.image, metadata: flags.metadata})

    } else if (flags.assetList) {

      if (!flags.output) {
        this.error('Output directory --output is required')
      }
      // fetch multiple assets
      const assets = fs.readFileSync(flags.assetList, 'utf-8').split('\n')
      await batchFetchCoreAssets(umi, assets, { outputDirectory: flags.output })
    }
  }
}
