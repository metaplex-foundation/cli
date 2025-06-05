import { Args, Flags } from '@oclif/core'

// import batchFetchCoreAssets from '../../../lib/core/fetch/batchFetch.js'
import { BaseCommand } from '../../../BaseCommand.js'
import fetchCoreAsset from '../../../lib/core/fetch/fetch.js'

/* 
  Fetch Possibilities:

  1. Fetch a single Asset by providing the Asset ID and display the metadata.

  TODO
  2. Fetch a single Asset by providing the Asset ID and download the metadata and image to disk.

  TODO
  3. Fetch multiple Assets by providing multiple Asset IDs from a .txt/.csv/json file and save metadata and image to disk (original or DAS format).
*/

export default class AssetFetch extends BaseCommand<typeof AssetFetch> {
  static description = 'Fetch an asset by mint address. Use --download to save files to disk. Without specific flags, downloads all files (asset data, metadata, and image).'

  static examples = [
    '<%= config.bin %> <%= command.id %> <assetId>',
    '<%= config.bin %> <%= command.id %> <assetId> --download',
    '<%= config.bin %> <%= command.id %> <assetId> --download --output ./assets',
    '<%= config.bin %> <%= command.id %> <assetId> --download --image',
    '<%= config.bin %> <%= command.id %> <assetId> --download --metadata',
    '<%= config.bin %> <%= command.id %> <assetId> --download --asset',
    '<%= config.bin %> <%= command.id %> <assetId> --download --image --metadata',
  ]

  static flags = {
    // Not implemented yet
    // assetList: Flags.file({ name: 'assetList', description: 'A file containing a list of asset IDs to fetch' }),
    download: Flags.boolean({
      description: 'Download asset files to disk. Without specific flags, downloads all files.',
      required: false,
    }),
    output: Flags.string({
      description: 'Directory path where to save the downloaded assets',
      required: false,
      dependsOn: ['download'],
    }),
    image: Flags.boolean({
      description: 'Download the image file (requires --download)',
      required: false,
      dependsOn: ['download'],
    }),
    metadata: Flags.boolean({
      description: 'Download the metadata file (requires --download)',
      required: false,
      dependsOn: ['download'],
    }),
    asset: Flags.boolean({
      description: 'Download the asset data file (requires --download)',
      required: false,
      dependsOn: ['download'],
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
      await fetchCoreAsset(umi, args.asset, {
        download: flags.download,
        outputPath: flags.download ? flags.output : undefined,
        // Pass the flags directly to let fetch.ts handle the downloadAll logic
        image: flags.download && flags.image,
        metadata: flags.download && flags.metadata,
        asset: flags.download && flags.asset,
      })
    }
    // Commented out batch fetch functionality for now
    /*
    else if (flags.assetList) {
      if (!flags.output) {
        this.error('Output directory --output is required')
      }

      const disabled = true

      if (disabled) {
        this.log('Fetching assets from list coming soon')
        return
      }
      // fetch multiple assets
      const assets = fs.readFileSync(flags.assetList, 'utf-8').split('\n')
      await batchFetchCoreAssets(umi, assets, { outputDirectory: flags.output })
    }
    */
  }
}
