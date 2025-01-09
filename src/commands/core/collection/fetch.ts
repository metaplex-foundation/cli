import {fetchAsset} from '@metaplex-foundation/mpl-core'
import {Args, Flags} from '@oclif/core'

import mime from 'mime-types'
import fetch from 'node-fetch'
import fs from 'node:fs'
import {basename} from 'node:path'
import {abort} from 'node:process'
import ora from 'ora'
import {BaseCommand} from '../../../BaseCommand.js'

//TODO: Refactor both fetch Asset and Collection to one fetch function with
// Asset/Collection type as optional argument.

export default class CollectionFetch extends BaseCommand<typeof CollectionFetch> {
  static args = {
    collection: Args.string({description: 'Collection pubkey (mint) to fetch', required: true}),
  }

  static description = 'Fetch an Collection by pubkey'

  static examples = [
    ...super.baseExamples,
    '<%= config.bin %> <%= command.id %> HaKyubAWuTS9AZkpUHtFkTKAHs1KKAJ3onZPmaP9zBpe',
  ]

  static flags = {
    download: Flags.boolean({name: 'download', char: 'd', description: 'downloads the asset data'}),
    output: Flags.string({
      name: 'output',
      char: 'o',
      description: 'output directory of the downloaded Collection. If not the current folder will be used.',
    }),
  }

  public async run(): Promise<unknown> {
    const {args, flags} = await this.parse(CollectionFetch)

    const {umi} = this.context
    const asset = await fetchAsset(umi, args.collection)

    if (flags.download) {
      this.log(`Downloading Collection ${args.collection}`)
      const directory = flags.output || process.cwd()

      // download JSON metadata
      const uri = asset.uri

      const metadataSpinner = ora('Downloading Metadata...').start()
      //TODO: Replace 'any' with offchain object type.
      const jsonFile: any = await fetch(uri)
        .then(async (res) => {
          metadataSpinner.succeed(`Metadata downloaded`)
          return await res.json()
        })
        .catch((err) => {
          metadataSpinner.fail(`Failed to fetch offchain metadata. ${err}`)
        })

      // download image
      const imageSpinner = ora('Downloading image...').start()
      const image = await fetch(jsonFile.image)
        .then(async (res) => {
          const contentType = res.headers.get('content-type')

          const ext = contentType && mime.extension(contentType)

          const fileName = basename(jsonFile.image) + (ext && `.${ext}`)

          const data = await res.arrayBuffer()

          imageSpinner.succeed('Image download')
          return {
            fileName,
            ext,
            data,
          }
        })
        .catch((err) => {
          metadataSpinner.fail(`Failed to fetch offchain metadata. ${err}`)
        })

      // Write files to directory
      if (!jsonFile && !image) {
        this.log('No files to write to disk. Aborting.')
        return
      }

      const fileWritingSpinner = ora('Writing files to directory...')

      const assetDirectory = directory + `/${args.collection}`

      const dirExists = fs.existsSync(assetDirectory)

      if (!dirExists && (jsonFile || image)) {
        fs.mkdirSync(assetDirectory, {recursive: true})
      }

      //TODO: Error checks on write
      // write metadata file to disk
      jsonFile && fs.writeFileSync(assetDirectory + '/metadata.json', JSON.stringify(jsonFile, null, 2))

      // write image file to disk
      image && fs.writeFileSync(assetDirectory + `/image.${image.ext}`, new Uint8Array(image.data))

      fileWritingSpinner.succeed(`Files written to ${assetDirectory}`)
    }

    // this.log(jsonStringify(asset, 2))
    return asset
  }
}
