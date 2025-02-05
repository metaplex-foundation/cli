import {Flags} from '@oclif/core'

import fs from 'node:fs'
import {BaseCommand} from '../../../BaseCommand.js'
import batchFetchCoreAssets from '../../../lib/core/fetch/batchFetch.js'
import fetchCoreAsset from '../../../lib/core/fetch/fetch.js'

/* 
  Fetch Possibilities:

  1. Fetch a single Asset by providing the Asset ID and display the metadata.

  2. Fetch a single Asset by providing the Asset ID and download the metadata and image to disk.

  TODO
  3. Fetch multiple Assets by providing multiple Asset IDs from a .txt/.csv/json file and save metadata and image to disk (original or DAS format).

  TODO
  4. Fetch multiple Assets by providing a collection ID and save metadata and image to disk (original or DAS format).

*/

export default class AssetFetch extends BaseCommand<typeof AssetFetch> {
  static description = 'Fetch an asset by mint'

  static examples = [
    ...super.baseExamples,
    '<%= config.bin %> <%= command.id %> HaKyubAWuTS9AZkpUHtFkTKAHs1KKAJ3onZPmaP9zBpe',
  ]

  static flags = {
    asset: Flags.string({name: 'asset', description: 'The asset ID to fetch'}),
    assetList: Flags.directory({name: 'assetList', description: 'A file containing a list of asset IDs to fetch'}),
    output: Flags.string({
      name: 'output',
      description: 'output directory of the downloaded asset. If not present current folder will be used.',
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

  public async run() {
    const {args, flags} = await this.parse(AssetFetch)

    const {umi} = this.context

    if (flags.asset) {
      // fetch a single asset
      await fetchCoreAsset(umi, flags.asset, {groupFiles: false, outputPath: flags.output})
    } else if (flags.assetList) {
      // fetch multiple assets
      const assets = fs.readFileSync(flags.assetList, 'utf-8').split('\n')
      await batchFetchCoreAssets(umi, assets, {groupFiles: false, outputDirectory: flags.output})
    }
  }
}
