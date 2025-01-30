import {Umi} from '@metaplex-foundation/umi'
import fetchCoreAsset from './fetch.js'

interface BatchFetchCoreAssetOptions {
  outputDirectory?: string
  groupFiles?: boolean
  tps?: number
}

const batchFetchCoreAssets = async (umi: Umi, assets: string[], options: BatchFetchCoreAssetOptions) => {
  console.log(`Downloading ${assets.length} assets`)

  for (const asset of assets) {
    console.log(`Downloading Asset ${asset}`)

    // fetch asset
    await fetchCoreAsset(umi, asset, {
      outputPath: options.groupFiles ? options.outputDirectory + '/' + asset : undefined,
    })
  }
}

export default batchFetchCoreAssets
