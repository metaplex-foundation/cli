import { input } from '@inquirer/prompts'
import { AssetV1, fetchAsset, fetchCollection, update } from '@metaplex-foundation/mpl-core'
import { fetchJsonMetadata, JsonMetadata } from '@metaplex-foundation/mpl-token-metadata'
import { createGenericFile, GenericFile, publicKey, Umi } from '@metaplex-foundation/umi'
import { Args, Flags } from '@oclif/core'
import mime from 'mime'
import fs from 'node:fs'
import { basename, join } from 'node:path'
import ora from 'ora'
import { txSignatureToString } from '../../../lib/util.js'
import { TransactionCommand } from '../../../TransactionCommand.js'
import { base58 } from '@metaplex-foundation/umi/serializers'
import { ExplorerType, generateExplorerUrl } from '../../../explorers.js'
import umiSendAndConfirmTransaction from '../../../lib/umi/sendAndConfirm.js'
import { fileTypeFromFile } from 'file-type'

/* 
  Update Possibilities:

  1. Update a single Asset by providing the Asset ID and the new name and/or URI.

  2. Update a single Asset by providing the Asset ID and a JSON file with the new metadata.

  3. Update a single Asset by providing the Asset ID and an image file to upload and assign to the Asset.

  4. Update a single Asset by providing the Asset ID and --edit flag to download the metadata JSON, open for editing, then use for update.

  5. Update multiple Assets by providing a folder path with JSON files named with Asset ids containing the new metadata.

  6. Update multiple Assets by providing a folder path with image files named with Asset ids to upload and assign to the Assets.

  7. Update multiple Assets by providing a folder path with JSON files named with Asset ids containing the new metadata and image files named with Asset ids to upload and assign to the Assets.

*/

export default class AssetUpdate extends TransactionCommand<typeof AssetUpdate> {
  static override description = 'Update an MPL Core Asset'

  static examples = [
    'Single Asset Update:',
    '<%= config.bin %> <%= command.id %> <assetId> --name "Updated Asset" --uri "https://example.com/metadata.json"',
    '<%= config.bin %> <%= command.id %> <assetId> --json ./asset/metadata.json --image ./asset/image.jpg --sync',
    '<%= config.bin %> <%= command.id %> <assetId> --name "Updated Asset"',
    '<%= config.bin %> <%= command.id %> <assetId> --image ./asset/image.jpg',
    '<%= config.bin %> <%= command.id %> <assetId> --json ./asset/metadata.json',
    '<%= config.bin %> <%= command.id %> <assetId> --edit',
  ]

  static override flags = {
    name: Flags.string({ name: "name", description: 'Asset name', exclusive: ['json', 'edit'] }),
    uri: Flags.string({ name: "uri", description: 'URI of the Asset metadata', exclusive: ['json', 'edit'] }),
    image: Flags.string({ name: "image", description: 'Path to image file' }),
    json: Flags.string({ name: "json", description: 'Path to JSON file', exclusive: ['name', 'uri', 'edit'] }),
    collectionId: Flags.string({ description: 'Collection ID' }),
    edit: Flags.boolean({
      name: "edit",
      description: 'Download metadata JSON, open for editing, then use for update',
      exclusive: ['name', 'uri', 'json']
    })
  }

  static override args = {
    assetId: Args.string({ name: 'Asset ID', description: 'Asset to update', required: true }),
  }

  // TODO - Refactor this out for reuse
  private async cleanupTempFiles(tempFile: string, tempDir: string): Promise<void> {
    try {
      // Only proceed if temp file exists
      if (!fs.existsSync(tempFile)) {
        console.log('Temp file does not exist, skipping cleanup')
        return
      }

      // Remove temp file
      fs.unlinkSync(tempFile)
      console.log('Removed temp file')

      // Only proceed with directory cleanup if temp dir exists
      if (!fs.existsSync(tempDir)) {
        console.log('Temp directory does not exist, skipping directory cleanup')
        return
      }

      // Check if temp dir is empty
      const remainingFiles = fs.readdirSync(tempDir)
      
      if (remainingFiles && remainingFiles.length === 0) {
        fs.rmdirSync(tempDir)

        // Check if .mplx dir exists and is empty
        const mplxDir = join(process.cwd(), '.mplx')
        if (fs.existsSync(mplxDir)) {
          const mplxFiles = fs.readdirSync(mplxDir)
          
          if (mplxFiles && mplxFiles.length === 0) {
            fs.rmdirSync(mplxDir)
          }
        }
      }
    } catch (error) {
      // Log but don't throw - cleanup errors shouldn't affect the main operation
      console.error('Warning: Failed to clean up temporary files:', error)
    }
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(AssetUpdate)
    const {umi} = this.context
    const assetId = args.assetId
    const { name, uri, image, json, edit } = flags

    if (!name && !uri && !image && !json && !edit) {
      this.error('You must provide at least one update flag: --name, --uri, --image, --json, or --edit')
    }

    const asset = await fetchAsset(umi, publicKey(assetId))

    if (edit) {
      if (image) {
        throw new Error('--image flag is not usable with --edit flag')
      }

      // Download and edit metadata
      const metadata = await this.getMetadata({ asset })
      const editedMetadata = await this.editMetadata(metadata)
      
      // Upload edited metadata
      const metadataUri = await this.uploadJson(umi, editedMetadata)
      
      // Update asset with edited metadata
      if (!editedMetadata.name) {
        throw new Error('Metadata must contain a name field')
      }
      await this.updateAsset(umi, asset, editedMetadata.name, metadataUri)

      // Clean up temp files after successful update
      const tempDir = join(process.cwd(), '.mplx', 'temp')
      const tempFile = join(tempDir, 'metadata.json')
      await this.cleanupTempFiles(tempFile, tempDir)
      return
    }

    if (uri) {
      // uri flag is seperate because it doesn't require modification of the original metadata.
      // we only sync from metadata json file to onchain name and not uri to onchain name.

      if (json || image) {
        throw new Error('--image and --json flags are not usable with --uri flag')
      }

      // use the new uri name
      const assetName = name || asset.name

      await this.updateAsset(umi, asset, assetName, uri)
    } else {
      // name, image, and json flags require modification of the original metadata and a new metadata upload.

      //validations
      if (name && json) {
        throw new Error('when syncing name from --json metadata file, do not provide a --name flag')
      }

      let metadata: JsonMetadata

      if (json) {
        // Fetch metadata from JSON file
        metadata = JSON.parse(fs.readFileSync(json, 'utf-8'))
      } else {
        // Fetch metadata from asset's current URI
        metadata = await this.getMetadata({ asset, uri, path: json })
      }

      if (image) {
        // Upload image
        const imageUri = await this.uploadFile(umi, image, 'Uploading Image...')
        const imageFile = await fileTypeFromFile(image)
        if (!imageFile) {
          throw new Error('Failed to get mime type for image')
        }
        const mimeType = imageFile.mime
        // Update image URI in metadata
        metadata.image = imageUri
        // Update image in properties.files at index 0
        if (metadata.properties?.files) {
          const imageFile = metadata.properties.files[0]
          if (imageFile) {
            imageFile.uri = imageUri
          } else {
            // Add image file if not found
            metadata.properties.files.push({
              uri: imageUri,
              type: mimeType
            })
          }
        } else {
          // Create properties.files if it doesn't exist
          metadata.properties = {
            ...metadata.properties,
            files: [{
              uri: imageUri,
              type: mimeType
            }]
          }
        }
      }

      let updatedName: string

      if (name) {
        updatedName = name
        // Update name in metadata if provided
        metadata.name = name
      } else if (json) {
        updatedName = metadata.name || ''
      } else {
        updatedName = asset.name
      }

      const metadataUri = await this.uploadJson(umi, metadata)

      await this.updateAsset(umi, asset, updatedName, metadataUri)
    }
  }

  private async editMetadata(metadata: JsonMetadata): Promise<JsonMetadata> {
    const spinner = ora('Preparing metadata for editing...').start()
    try {
      // Create temp directory if it doesn't exist
      const tempDir = join(process.cwd(), '.mplx', 'temp')
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true })
      }

      // Create temp file with metadata
      const tempFile = join(tempDir, 'metadata.json')
      fs.writeFileSync(tempFile, JSON.stringify(metadata, null, 2))

      spinner.succeed('Metadata file ready for editing')
      console.log('\nEdit the metadata file at:')
      console.log(tempFile)
      console.log('\nPress Enter when you have finished editing...')
      
      // Wait for Enter key press
      await input({
        message: '',
        default: ''
      })

      // Read edited file
      const editedContent = fs.readFileSync(tempFile, 'utf-8')
      const editedMetadata = JSON.parse(editedContent)

      // Validate edited metadata
      if (!editedMetadata.name) {
        throw new Error('Metadata missing required field: name')
      }

      return editedMetadata
    } catch (error) {
      spinner.fail('Failed to edit metadata')
      throw error
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

  private formatAssetResult(asset: AssetV1, signature: Uint8Array, explorer: ExplorerType): string {
    return `--------------------------------
  Asset: ${asset.publicKey}
  Signature: ${base58.deserialize(signature)}
  Explorer: ${generateExplorerUrl(explorer, base58.deserialize(signature)[0], 'transaction')}
  Core Explorer: https://core.metaplex.com/explorer/${asset.publicKey}
--------------------------------`
  }

  private async updateAsset(umi: Umi, asset: AssetV1, name: string, uri: string): Promise<void> {
    const spinner = ora('Updating Asset on-chain...').start()
    try {
      let collection
      if (asset.updateAuthority.type === 'Collection' && asset.updateAuthority.address) {
        collection = await fetchCollection(umi, publicKey(asset.updateAuthority.address))
      }
      const result = await update(umi, { asset, collection, name, uri }).sendAndConfirm(umi)

      spinner.succeed('Asset updated successfully')
      this.log(this.formatAssetResult(asset, result.signature, this.context.explorer as ExplorerType))
    } catch (error) {
      spinner.fail('Asset update failed')
      throw error
    }
  }
}
