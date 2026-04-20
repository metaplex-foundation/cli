import { AssetV1, baseUpdateAuthority, fetchAsset, fetchCollection, update } from '@metaplex-foundation/mpl-core'
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
  static override description = `Update an MPL Core Asset's name, URI, image, offchain metadata, or collection.

  Update specific fields with --name and/or --uri, or provide a metadata JSON file
  with --offchain to sync the on-chain name from the file. Use --image to upload and
  assign a new image. Combinations like --offchain with --image are supported.

  Use --collection to add the asset to a collection or move it to a different one.
  Use --remove-collection to remove the asset from its current collection.`

  static examples = [
    'Single Asset Update:',
    '<%= config.bin %> <%= command.id %> <assetId> --name "Updated Asset" --uri "https://example.com/metadata.json"',
    '<%= config.bin %> <%= command.id %> <assetId> --offchain ./asset/metadata.json --image ./asset/image.jpg --sync',
    '<%= config.bin %> <%= command.id %> <assetId> --name "Updated Asset"',
    '<%= config.bin %> <%= command.id %> <assetId> --image ./asset/image.jpg',
    '<%= config.bin %> <%= command.id %> <assetId> --offchain ./asset/metadata.json',
    'Collection operations:',
    '<%= config.bin %> <%= command.id %> <assetId> --collection <collectionId>',
    '<%= config.bin %> <%= command.id %> <assetId> --remove-collection',
  ]

  static override flags = {
    name: Flags.string({ name: "name", description: 'Asset name', exclusive: ['offchain'] }),
    uri: Flags.string({ name: "uri", description: 'URI of the Asset metadata', exclusive: ['offchain'] }),
    image: Flags.string({ name: "image", description: 'Path to image file' }),
    offchain: Flags.string({ name: "offchain", description: 'Path to JSON offchain metadata file', exclusive: ['name', 'uri'] }),
    collection: Flags.string({ description: 'Add or move the asset to this collection', exclusive: ['remove-collection'] }),
    'remove-collection': Flags.boolean({ description: 'Remove the asset from its current collection', exclusive: ['collection'], default: false }),
  }

  static override args = {
    assetId: Args.string({ name: 'Asset ID', description: 'Asset to update', required: true }),
  }

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(AssetUpdate)
    const umi = this.context.umi
    const assetId = args.assetId
    const { name, uri, image, offchain: metadataFile, collection: collectionFlag, 'remove-collection': removeCollection } = flags

    if (!name && !uri && !image && !metadataFile && !collectionFlag && !removeCollection) {
      this.error('You must provide at least one update flag: --name, --uri, --image, --offchain, --collection, or --remove-collection')
    }

    const asset = await fetchAsset(umi, publicKey(assetId))

    // Handle collection-only operations (no metadata changes)
    if ((collectionFlag || removeCollection) && !name && !uri && !image && !metadataFile) {
      return await this.updateAsset(umi, asset, asset.name, asset.uri, { collectionFlag, removeCollection })
    }

    if (uri) {
      // uri flag is seperate because it doesn't require modification of the original metadata.
      // we only sync from metadata json file to onchain name and not uri to onchain name.

      if (metadataFile || image) {
        throw new Error('--image and --offchain flags are not usable with --uri flag')
      }

      // use the new uri name
      const assetName = name || asset.name

      return await this.updateAsset(umi, asset, assetName, uri, { collectionFlag, removeCollection })
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

      return await this.updateAsset(umi, asset, updatedName, metadataUri, { collectionFlag, removeCollection })
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

  private async updateAsset(umi: Umi, asset: AssetV1, name: string, uri: string, options?: { collectionFlag?: string; removeCollection?: boolean }): Promise<unknown> {
    const { collectionFlag, removeCollection } = options ?? {}
    const spinner = ora('Updating Asset on-chain...').start()
    try {
      let collection
      if (asset.updateAuthority.type === 'Collection' && asset.updateAuthority.address) {
        collection = await fetchCollection(umi, publicKey(asset.updateAuthority.address))
      }

      const updateArgs: Parameters<typeof update>[1] = { asset, collection, name, uri }

      if (collectionFlag) {
        const newCollection = await fetchCollection(umi, publicKey(collectionFlag))
        updateArgs.newCollection = newCollection.publicKey
        updateArgs.newUpdateAuthority = baseUpdateAuthority('Collection', [newCollection.publicKey])
      } else if (removeCollection) {
        if (asset.updateAuthority.type !== 'Collection') {
          spinner.fail('Asset is not in a collection')
          this.error('Cannot remove from collection: asset does not belong to a collection')
        }
        updateArgs.newUpdateAuthority = baseUpdateAuthority('Address', [umi.identity.publicKey])
      }

      const txBuilder = update(umi, updateArgs)
      const tx = await umiSendAndConfirmTransaction(umi, txBuilder)
      const signature = txSignatureToString(tx.transaction.signature as Uint8Array)
      const explorerUrl = generateExplorerUrl(this.context.explorer, this.context.chain, signature, 'transaction')

      let successMessage = `Asset updated: ${asset.publicKey}`
      if (collectionFlag) {
        successMessage = collection ? `Asset moved to new collection` : `Asset added to collection`
      } else if (removeCollection) {
        successMessage = `Asset removed from collection`
      }
      spinner.succeed(`${successMessage} (Tx: ${signature})`)

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
