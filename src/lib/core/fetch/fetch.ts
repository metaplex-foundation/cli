import { AssetV1, fetchAsset } from '@metaplex-foundation/mpl-core'
import { publicKey, Umi } from '@metaplex-foundation/umi'
import mime from 'mime-types'
import { basename } from 'node:path'
import fs from 'node:fs'
import { JsonMetadata } from '@metaplex-foundation/mpl-token-metadata'
import { jsonStringify } from '../../util.js'
import ora from 'ora'
import util from 'node:util'

interface FetchCoreAssetOptions {
  outputPath?: string
  image?: boolean
  metadata?: boolean
}

const fetchCoreAsset = async (umi: Umi, asset: string, options: FetchCoreAssetOptions) => {

  // Fetch the Asset
  const fetchedAsset = await fetchAsset(umi, publicKey(asset))

  if (options.outputPath) {

    const fetchSpinner = ora('Downloading Asset...').start()
    // TODO: decide on what to download as team.
    // 1. Download asset.json file?
    // 2. Download asset image?
    // 3. Download metadata.json?
    // Fix grouped files into a single <assetId> folder.

    let downloadAll = true

    if (options.image || options.metadata) {
      downloadAll = false
    }

    const directory = options.outputPath || process.cwd()

    // download JSON metadata
    const uri = fetchedAsset.uri

    const jsonFile: JsonMetadata = await fetch(uri)
      .then(async (res) => {
        return await res.json()
      })
      .catch((err) => {
        throw new Error(`Failed to fetch offchain metadata. ${err}`)
      })


    // create directory for asset

    const assetDirectory = directory + `${asset}`

    const dirExists = fs.existsSync(assetDirectory)

    if (!dirExists) {
      fs.mkdirSync(assetDirectory, { recursive: true })
    }

    if (options.image || downloadAll) {

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

      // write image file to disk
      image && fs.writeFileSync(assetDirectory + `/image.${image.ext}`, new Uint8Array(image.data))

    }

    if (options.metadata || downloadAll) {
      // write metadata file to disk
      jsonFile && fs.writeFileSync(assetDirectory + '/metadata.json', jsonStringify(jsonFile, 2))
    }

    if (downloadAll) {
      fs.writeFileSync(assetDirectory + '/asset.json', jsonStringify(fetchedAsset, 2))
    }

    fetchSpinner.succeed(`Asset Downloaded`)

    console.log(`--------------------------------\n`)
    console.log(`Asset ${asset}\n`)
    console.log(util.inspect(fetchedAsset, false, null, true /* enable colors */))
    console.log(`Location: ${assetDirectory}`)
    console.log(`---------------------------------`)

    return assetDirectory
  } else {
    console.log(util.inspect(fetchedAsset, false, null, true /* enable colors */))
  }
}

export default fetchCoreAsset
