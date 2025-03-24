import {Umi} from '@metaplex-foundation/umi'
import fetchCoreAsset from './fetch.js'

interface BatchFetchCoreAssetOptions {
  outputDirectory?: string
}

const batchFetchCoreAssets = async (umi: Umi, assets: string[], options: BatchFetchCoreAssetOptions) => {
  console.log(`Downloading ${assets.length} assets`)

  for (const asset of assets) {
    console.log(`Downloading Asset ${asset}`)

    // fetch asset
    await fetchCoreAsset(umi, asset, {
      outputPath: options.outputDirectory + '/' + asset,
    })
  }
}

export default batchFetchCoreAssets
