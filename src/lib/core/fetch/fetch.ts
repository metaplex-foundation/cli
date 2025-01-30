import {fetchAsset} from '@metaplex-foundation/mpl-core'
import {publicKey, Umi} from '@metaplex-foundation/umi'
import mime from 'mime-types'
import {basename} from 'node:path'
import fs from 'node:fs'
import {JsonMetadata} from '@metaplex-foundation/mpl-token-metadata'

interface FetchCoreAssetOptions {
  outputPath?: string
  groupFiles?: boolean
}

const fetchCoreAsset = async (umi: Umi, asset: string, options: FetchCoreAssetOptions) => {
  const fetchedAsset = await fetchAsset(umi, publicKey(asset))

  if (options.outputPath) {
    console.log(`Downloading Asset ${asset}`)

    // TODO: decide on what to download as team.
    // 1. Download asset.json file?
    // 2. Download asset image?
    // 3. Download metadata.json?
    // Fix grouped files into a single <assetId> folder.

    console.log(`Downloading Asset ${asset}`)
    const directory = options.outputPath || process.cwd()

    // download JSON metadata
    const uri = fetchedAsset.uri

    //TODO: Replace 'any' with offchain object type.
    const jsonFile: JsonMetadata = await fetch(uri)
      .then(async (res) => {
        return await res.json()
      })
      .catch((err) => {
        throw new Error(`Failed to fetch offchain metadata. ${err}`)
      })

    // download image

    let image

    if (jsonFile.image) {
      image = await fetch(jsonFile.image)
        .then(async (res) => {
          const contentType = res.headers.get('content-type')

          const ext = contentType && mime.extension(contentType)

          // TODO: Fix `jsonFile.image!`
          const fileName = basename(jsonFile.image!) + (ext && `.${ext}`)

          const data = await res.arrayBuffer()

          return {
            fileName,
            ext,
            data,
          }
        })
        .catch((err) => {
          throw new Error(`Failed to fetch offchain metadata. ${err}`)
        })
    }

    // Write files to directory
    if (!jsonFile && !image) {
      console.log('No files to write to disk. Aborting.')
      return
    }

    const assetDirectory = directory + `/${asset}`

    const dirExists = fs.existsSync(assetDirectory)

    if (!dirExists && (jsonFile || image)) {
      fs.mkdirSync(assetDirectory, {recursive: true})
    }

    //TODO: Error checks on write
    // write metadata file to disk
    jsonFile && fs.writeFileSync(assetDirectory + '/metadata.json', JSON.stringify(jsonFile, null, 2))

    // write image file to disk
    image && fs.writeFileSync(assetDirectory + `/image.${image.ext}`, new Uint8Array(image.data))
  } else {
    return fetchedAsset
  }
}

export default fetchCoreAsset
