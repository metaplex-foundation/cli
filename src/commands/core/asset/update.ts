import { AssetV1, fetchAsset, fetchCollection, update } from '@metaplex-foundation/mpl-core'
import { fetchJsonMetadata, JsonMetadata } from '@metaplex-foundation/mpl-token-metadata'
import { createGenericFile, publicKey, Umi } from '@metaplex-foundation/umi'
import { Args, Flags } from '@oclif/core'

import mime from 'mime'
import fs from 'node:fs'
import { basename } from 'node:path'
import ora from 'ora'
import { generateExplorerUrl } from '../../../explorers.js'
import { txSignatureToString } from '../../../lib/util.js'
import { TransactionCommand } from '../../../TransactionCommand.js'
import umiSendAndConfirmTransaction from '../../../lib/umi/sendAndConfirm.js'

/* 
  Update Possibilities:

  1. Update a single Asset by providing the Asset ID and the new name and/or URI.

  2. Update a single Asset by providing the Asset ID and a JSON file with the new metadata.

  3. Update a single Asset by providing the Asset ID and an image file to upload and assign to the Asset.

  4. Update multiple Assets by providing a folder path with JSON files named with Asset ids containing the new metadata.

  5. Update multiple Assets by providing a folder path with image files named with Asset ids to upload and assign to the Assets.

  6. Update multiple Assets by providing a folder path with JSON files named with Asset ids containing the new metadata and image files named with Asset ids to upload and assign to the Assets.

*/

export default class AssetUpdate extends TransactionCommand<typeof AssetUpdate> {
  static override description = 'Update an MPL Core Asset'

  static examples = [
    'Single Asset Update:',
    '<%= config.bin %> <%= command.id %> <assetId> --name "Updated Asset" --uri "https://example.com/metadata.json"',
    '<%= config.bin %> <%= command.id %> <assetId> --offchain ./asset/metadata.json --image ./asset/image.jpg --sync',
    '<%= config.bin %> <%= command.id %> <assetId> --name "Updated Asset"',
    '<%= config.bin %> <%= command.id %> <assetId> --image ./asset/image.jpg',
    '<%= config.bin %> <%= command.id %> <assetId> --offchain ./asset/metadata.json',
  ]

  static override flags = {
    name: Flags.string({ name: "name", description: 'Asset name', exclusive: ['offchain'] }),
    uri: Flags.string({ name: "uri", description: 'URI of the Asset metadata', exclusive: ['offchain'] }),
    image: Flags.string({ name: "image", description: 'Path to image file' }),
    offchain: Flags.string({ name: "offchain", description: 'Path to JSON offchain metadata file', exclusive: ['name', 'uri'] }),
    collectionId: Flags.string({ description: 'Collection ID' }),
  }

  static override args = {
    assetId: Args.string({ name: 'Asset ID', description: 'Asset to update', required: true }),
  }

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(AssetUpdate)
    const umi = this.context.umi
    const assetId = args.assetId
    const { name, uri, image, offchain: metadataFile } = flags

    if (!name && !uri && !image && !metadataFile) {
      this.error('You must provide at least one update flag: --name, --uri, --image, or --offchain')
    }

    const asset = await fetchAsset(umi, publicKey(assetId))

    if (uri) {
      // uri flag is seperate because it doesn't require modification of the original metadata.
      // we only sync from metadata json file to onchain name and not uri to onchain name.

      if (metadataFile || image) {
        throw new Error('--image and --offchain flags are not usable with --uri flag')
      }

      // use the new uri name
      const assetName = name || asset.name

      return await this.updateAsset(umi, asset, assetName, uri)
    } else {
      // name, image, and metadata flags require modification of the original metadata and a new metadata upload.

      //validations
      if (name && metadataFile) {
        throw new Error('when syncing name from --offchain file, do not provide a --name flag')
      }

      let metadata: JsonMetadata

      if (metadataFile) {
        // Fetch metadata from JSON file
        metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf-8'))
      } else {
        // Fetch metadata from asset's current URI
        metadata = await this.getMetadata({ asset, uri, path: metadataFile })
      }

      if (image) {
        // Upload image
        const imageUri = await this.uploadFile(umi, image, 'Uploading Image...')
        metadata.uri = imageUri
      }

      let updatedName: string

      if (name) {
        updatedName = name
      } else if (metadataFile) {
        updatedName = metadata.name || ''
      } else {
        updatedName = asset.name
      }

      const metadataUri = await this.uploadJson(umi, metadata)

      return await this.updateAsset(umi, asset, updatedName, metadataUri)
    }
  }

  private async getMetadata({ asset, uri, path }: { asset?: AssetV1; uri?: string; path?: string }): Promise<JsonMetadata> {
    if (uri) {
      // Fetch metadata from URI
      return await this.fetchUriMetadata(uri)
    }

    if (path) {
      // Use JSON file metadata
      return JSON.parse(fs.readFileSync(path, 'utf-8'))
    }

    if (asset) {
      return await this.fetchUriMetadata(asset.uri)
    }

    throw new Error('No metadata source provided')
  }

  private async fetchUriMetadata(uri: string): Promise<JsonMetadata> {
    const spinner = ora(`Fetching metadata from URI: ${uri}`).start()
    try {
      const metadata = await fetchJsonMetadata(this.context.umi, uri)

      //assert metadata is valid
      if (!metadata.name) {
        throw new Error('Metadata missing required field: name')
      }

      spinner.succeed('Metadata fetched successfully')
      return metadata
    } catch (error) {
      spinner.fail('Failed to fetch metadata')
      throw error
    }
  }

  // TODO - Refactor this to use the Umi uploader lib folder for resuse
  private async uploadFile(umi: Umi, filePath: string, message: string): Promise<string> {
    const spinner = ora(message).start()
    try {
      const file = fs.readFileSync(filePath)
      const mimeType = mime.getType(filePath)
      const genericFile = createGenericFile(file, basename(filePath), {
        tags: mimeType ? [{ name: 'mimeType', value: mimeType }] : [],
      })
      const [uri] = await umi.uploader.upload([genericFile])
      spinner.succeed(`File uploaded: ${uri}`)
      return uri
    } catch (error) {
      spinner.fail('File upload failed')
      throw error
    }
  }

  private async uploadJson(umi: Umi, metadata: any): Promise<string> {
    const spinner = ora('Uploading JSON Metadata...').start()
    try {
      const uri = await umi.uploader.uploadJson(metadata)
      spinner.succeed(`Metadata uploaded: ${uri}`)
      return uri
    } catch (error) {
      spinner.fail('JSON Metadata upload failed')
      throw error
    }
  }

  private async updateAsset(umi: Umi, asset: AssetV1, name: string, uri: string): Promise<unknown> {
    const spinner = ora('Updating Asset on-chain...').start()
    try {
      let collection
      if (asset.updateAuthority.type === 'Collection' && asset.updateAuthority.address) {
        collection = await fetchCollection(umi, publicKey(asset.updateAuthority.address))
      }
      const txBuilder = update(umi, { asset, collection, name, uri })
      const tx = await umiSendAndConfirmTransaction(umi, txBuilder)
      const signature = txSignatureToString(tx.transaction.signature as Uint8Array)
      const explorerUrl = generateExplorerUrl(this.context.explorer, this.context.chain, signature, 'transaction')
      spinner.succeed(`Asset updated: ${asset.publicKey} (Tx: ${signature})`)
      return {
        asset: asset.publicKey.toString(),
        signature,
        explorer: explorerUrl,
      }
    } catch (error) {
      spinner.fail('Asset update failed')
      throw error
    }
  }
}
