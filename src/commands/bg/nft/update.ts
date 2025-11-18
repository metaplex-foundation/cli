import { Args, Flags } from '@oclif/core'
import ora from 'ora'
import { publicKey, PublicKey, some, unwrapOptionRecursively } from '@metaplex-foundation/umi'
import { getAssetWithProof, updateMetadataV2, UpdateArgsArgs, MetadataArgsV2Args } from '@metaplex-foundation/mpl-bubblegum'
import { fetchJsonMetadata } from '@metaplex-foundation/mpl-token-metadata'
import mime from 'mime'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { spawnSync } from 'node:child_process'

import { TransactionCommand } from '../../../TransactionCommand.js'
import { generateExplorerUrl } from '../../../explorers.js'
import umiSendAndConfirmTransaction from '../../../lib/umi/sendAndConfirm.js'
import { txSignatureToString } from '../../../lib/util.js'
import { TransactionSignature } from '@metaplex-foundation/umi'
import imageUploader from '../../../lib/uploader/imageUploader.js'
import uploadJson from '../../../lib/uploader/uploadJson.js'

export default class BgNftUpdate extends TransactionCommand<typeof BgNftUpdate> {
  static override description = `Update a Bubblegum compressed NFT's metadata.

This command allows you to update the off-chain metadata of a compressed NFT.
Use --editor to edit the metadata JSON in your default editor, or provide
individual flags to update specific fields.

Note: The signer must be either the tree authority (if no collection) or the
collection update authority (if part of a collection).`

  private convertToV2Metadata(metadata: any): MetadataArgsV2Args {
    // Extract collection key if present
    const collectionData = unwrapOptionRecursively(metadata.collection)
    const collection = collectionData?.key ? some(collectionData.key) : null

    return {
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri,
      sellerFeeBasisPoints: metadata.sellerFeeBasisPoints,
      primarySaleHappened: metadata.primarySaleHappened,
      isMutable: metadata.isMutable,
      tokenStandard: metadata.tokenStandard,
      collection,
      creators: metadata.creators,
    }
  }

  static override summary = 'Update a compressed NFT metadata'

  static override examples = [
    '$ mplx bg nft update <assetId> --name "New Name"',
    '$ mplx bg nft update <assetId> --name "New Name" --description "New Description" --image ./image.png',
    '$ mplx bg nft update <assetId> --uri "https://example.com/new-metadata.json"',
    '$ mplx bg nft update <assetId> --editor',
  ]

  static override args = {
    assetId: Args.string({
      description: 'The compressed NFT asset ID (leaf asset ID) to update',
      required: true,
    }),
  }

  static override flags = {
    name: Flags.string({ description: 'New name for the NFT', exclusive: ['editor'] }),
    symbol: Flags.string({ description: 'New symbol for the NFT', exclusive: ['editor'] }),
    uri: Flags.string({
      description: 'New URI for the NFT metadata (alternative to updating individual fields)',
      exclusive: ['image', 'description', 'editor'],
    }),
    image: Flags.file({ description: 'Path to new image file', exclusive: ['uri', 'editor'] }),
    description: Flags.string({ description: 'New description for the NFT', exclusive: ['uri', 'editor'] }),
    editor: Flags.boolean({
      char: 'e',
      description: 'Open the metadata JSON in your default editor for editing',
      exclusive: ['name', 'symbol', 'uri', 'image', 'description'],
    }),
  }

  private openInEditor(filePath: string): boolean {
    // Get editor from environment or use platform-specific fallbacks
    let editor = process.env.EDITOR || process.env.VISUAL

    if (!editor) {
      // Platform-specific defaults
      const platform = process.platform
      if (platform === 'win32') {
        editor = 'notepad'
      } else if (platform === 'darwin' || platform === 'linux') {
        // Try nano first, fallback to vi
        editor = 'nano'
      } else {
        editor = 'vi'
      }
    }

    this.log(`Opening ${filePath} in ${editor}...`)
    this.log('Save and close the editor when done editing.')

    const result = spawnSync(editor, [filePath], {
      stdio: 'inherit',
      shell: true,
    })

    if (result.error) {
      this.error(`Failed to open editor: ${result.error.message}`)
      return false
    }

    return result.status === 0
  }

  private async interactiveUpdate(assetId: string) {
    const { umi } = this.context

    // Validate asset ID
    let assetPubkey: PublicKey
    try {
      assetPubkey = publicKey(assetId)
    } catch {
      this.error(`Invalid asset ID: ${assetId}`)
    }

    const fetchSpinner = ora('Fetching asset and proof data...').start()

    // Fetch asset with proof
    const assetWithProof = await getAssetWithProof(umi, assetPubkey, {
      truncateCanopy: true,
    }).catch((err) => {
      fetchSpinner.fail('Failed to fetch asset data')
      throw err
    })

    fetchSpinner.succeed('Asset data fetched')

    // Note: Update authority is either the tree authority or collection update authority
    // The updateMetadataV2 instruction will verify the authority - we don't check ownership here

    // Fetch current metadata from the current URI
    this.log('Fetching current metadata JSON...')

    // Get current URI - it's in the metadata field
    const currentUri = assetWithProof.metadata.uri
    const currentMetadata = await fetchJsonMetadata(umi, currentUri).catch((error) => {
      this.error(
        `Failed to fetch JSON metadata: ${error instanceof Error ? error.message : String(error)}`
      )
    })

    // Create temp file
    const tempDir = os.tmpdir()
    const tempFile = path.join(tempDir, `cnft-metadata-${assetId.slice(0, 8)}.json`)

    // Write current metadata to temp file
    fs.writeFileSync(tempFile, JSON.stringify(currentMetadata, null, 2))
    this.log(`Metadata written to: ${tempFile}`)

    // Open in editor
    const editSuccess = this.openInEditor(tempFile)

    if (!editSuccess) {
      fs.unlinkSync(tempFile)
      this.error('Editor exited with an error. Update cancelled.')
    }

    // Read modified metadata
    let modifiedMetadata
    try {
      const fileContent = fs.readFileSync(tempFile, 'utf-8')
      modifiedMetadata = JSON.parse(fileContent)
    } catch (error) {
      fs.unlinkSync(tempFile)
      this.error(`Failed to parse modified JSON: ${error instanceof Error ? error.message : String(error)}`)
    }

    // Clean up temp file
    fs.unlinkSync(tempFile)

    // Upload new metadata
    const jsonUploadSpinner = ora('Uploading updated metadata...').start()
    const newMetadataUri = await uploadJson(umi, modifiedMetadata).catch((err) => {
      jsonUploadSpinner.fail('Failed to upload metadata')
      throw err
    })
    jsonUploadSpinner.succeed('Metadata uploaded')

    // Update on-chain
    const updateSpinner = ora('Updating compressed NFT on-chain...').start()

    const updateArgs: UpdateArgsArgs = {
      name: some(modifiedMetadata.name || assetWithProof.metadata.name),
      uri: some(newMetadataUri),
    }

    const updateBuilder = updateMetadataV2(umi, {
      ...assetWithProof,
      leafOwner: assetWithProof.leafOwner,
      currentMetadata: this.convertToV2Metadata(assetWithProof.metadata),
      updateArgs,
    })

    const result = await umiSendAndConfirmTransaction(umi, updateBuilder).catch((err) => {
      updateSpinner.fail('Failed to update compressed NFT')
      throw err
    })

    updateSpinner.succeed('Compressed NFT updated successfully!')

    return {
      assetId,
      signature: result.transaction.signature,
      name: modifiedMetadata.name,
    }
  }

  private async updateWithFlags(input: {
    assetId: string
    name?: string
    symbol?: string
    uri?: string
    image?: string
    description?: string
  }) {
    const { umi } = this.context

    // Validate asset ID
    let assetPubkey: PublicKey
    try {
      assetPubkey = publicKey(input.assetId)
    } catch {
      this.error(`Invalid asset ID: ${input.assetId}`)
    }

    const fetchSpinner = ora('Fetching asset and proof data...').start()

    // Fetch asset with proof
    const assetWithProof = await getAssetWithProof(umi, assetPubkey, {
      truncateCanopy: true,
    }).catch((err) => {
      fetchSpinner.fail('Failed to fetch asset data')
      throw err
    })

    fetchSpinner.succeed('Asset data fetched')

    // Note: Update authority is either the tree authority or collection update authority
    // The updateMetadataV2 instruction will verify the authority - we don't check ownership here

    let newMetadataUri = input.uri

    // If URI is not provided, we need to fetch existing metadata and update it
    if (!input.uri && (input.name || input.symbol || input.image || input.description)) {
      this.log('Fetching existing metadata to update JSON...')
      const currentUri = assetWithProof.metadata.uri
      const originalJsonMetadata = await fetchJsonMetadata(umi, currentUri).catch((error) => {
        this.log(
          `Failed to fetch JSON metadata: ${error instanceof Error ? error.message : String(error)}`
        )
        return undefined
      })

      // If metadata fetch failed and we're updating metadata fields, all fields must be provided
      if (!originalJsonMetadata) {
        if (!input.name || !input.description || !input.symbol || !input.image) {
          this.error(
            'Failed to fetch existing metadata. All fields (--name, --description, --symbol, --image) must be provided to update the NFT.'
          )
        }
      }

      // Upload new image if provided
      const imageUploadSpinner = input.image && ora('Uploading Image...').start()
      const newImageUri = input.image && (await imageUploader(umi, input.image))
      imageUploadSpinner && imageUploadSpinner.succeed('Image uploaded')

      // Get the mime type for the new image or use the existing one
      const imageMimeType = input.image
        ? mime.getType(input.image) || 'application/octet-stream'
        : originalJsonMetadata?.properties?.files?.[0]?.type || 'image/png'

      // Create updated metadata JSON with proper structure
      const newMetadata = {
        ...originalJsonMetadata,
        name: input.name || originalJsonMetadata?.name,
        description: input.description || originalJsonMetadata?.description,
        symbol: input.symbol || originalJsonMetadata?.symbol,
        image: newImageUri || originalJsonMetadata?.image,
        properties: {
          ...originalJsonMetadata?.properties,
          files: [
            {
              uri: newImageUri || originalJsonMetadata?.image,
              type: imageMimeType,
            },
            // Preserve any additional files (like animations) from original metadata
            ...(originalJsonMetadata?.properties?.files?.slice(1) || []),
          ],
        },
      }

      // Upload updated metadata JSON
      const jsonUploadSpinner = ora('Uploading JSON file...').start()
      newMetadataUri = await uploadJson(umi, newMetadata)
      jsonUploadSpinner.succeed('Uploaded JSON')
    }

    // Update on-chain
    const updateSpinner = ora('Updating compressed NFT...').start()

    const updateArgs: UpdateArgsArgs = {
      name: some(input.name || assetWithProof.metadata.name),
      uri: some(newMetadataUri || assetWithProof.metadata.uri),
    }

    const updateBuilder = updateMetadataV2(umi, {
      ...assetWithProof,
      leafOwner: assetWithProof.leafOwner,
      currentMetadata: this.convertToV2Metadata(assetWithProof.metadata),
      updateArgs,
    })

    const result = await umiSendAndConfirmTransaction(umi, updateBuilder).catch((err) => {
      updateSpinner.fail('Failed to update compressed NFT')
      throw err
    })

    updateSpinner.succeed('Compressed NFT updated successfully!')

    return {
      assetId: input.assetId,
      signature: result.transaction.signature,
      name: input.name || assetWithProof.metadata.name,
    }
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(BgNftUpdate)
    const { explorer, chain } = this.context

    this.log(`--------------------------------

  Compressed NFT Update

--------------------------------`)

    let result

    if (flags.editor) {
      // Editor mode: open JSON in editor
      result = await this.interactiveUpdate(args.assetId)
    } else {
      // Validate that at least one update flag is provided
      if (!flags.name && !flags.symbol && !flags.uri && !flags.image && !flags.description) {
        this.error(
          'Nothing to update. Please provide at least one flag: --name, --symbol, --uri, --image, --description, or --editor'
        )
      }

      result = await this.updateWithFlags({
        assetId: args.assetId,
        name: flags.name,
        symbol: flags.symbol,
        uri: flags.uri,
        image: flags.image,
        description: flags.description,
      })
    }

    const signature = txSignatureToString(result.signature as Uint8Array)
    this.log(`--------------------------------
  Compressed NFT: ${result.name}
  Asset ID: ${result.assetId}
  Signature: ${signature}
  Explorer: ${generateExplorerUrl(explorer, chain, signature, 'transaction')}
--------------------------------`)

    if (this.jsonEnabled()) {
      this.logJson({
        assetId: result.assetId,
        signature,
        explorer: generateExplorerUrl(explorer, chain, signature, 'transaction'),
      })
    }
  }
}
