import { Args, Flags as OclifFlags } from '@oclif/core'
import ora from 'ora'
import fs from 'node:fs'
import untildify from 'untildify'
import mime from 'mime'
import {
  findLeafAssetIdPda,
  mintV2,
  parseLeafFromMintV2Transaction,
  TokenStandard,
} from '@metaplex-foundation/mpl-bubblegum'
import { none, publicKey, PublicKey, some, Umi } from '@metaplex-foundation/umi'

import { TransactionCommand } from '../../../TransactionCommand.js'
import type { Flags as CommandFlags } from '../../../TransactionCommand.js'
import { generateExplorerUrl } from '../../../explorers.js'
import uploadFile from '../../../lib/uploader/uploadFile.js'
import uploadJson from '../../../lib/uploader/uploadJson.js'
import createBubblegumMetadataPrompt, {
  CreateBubblegumMetadataPromptResult,
} from '../../../prompts/createBubblegumMetadataPrompt.js'
import selectTreePrompt from '../../../prompts/selectTreePrompt.js'
import umiSendAndConfirmTransaction from '../../../lib/umi/sendAndConfirm.js'
import { getTreeByNameOrAddress } from '../../../lib/treeStorage.js'
import { RpcChain, txSignatureToString } from '../../../lib/util.js'
import { TransactionSignature } from '@metaplex-foundation/umi'

type NetworkLabel = 'mainnet' | 'devnet' | 'testnet' | 'localnet'

type MetadataResolution = {
  name: string
  uri: string
  sellerFeePercentage?: number
  collection?: string
}

type CreateResultSummary = {
  signature: string
  owner: string
  tree: string
  assetId?: string
}

export default class BgNftCreate extends TransactionCommand<typeof BgNftCreate> {
  static override description = `Create a Bubblegum compressed NFT into a Merkle tree.

Supports the same creation flows as 'tm create':
  • Wizard mode (uploads assets & metadata for you)
  • File-based creation (--image + --json)
  • URI-based creation (--name + --uri)
  • Manual metadata assembly (--name + --image + other flags)

You must provide the tree as the first argument (saved name or public key).

Note: Bubblegum V2 uses Metaplex Core collections. To create a Core collection:
  $ mplx core collection create --wizard`

  static override summary = 'Create a compressed NFT into a Bubblegum Merkle tree'

  static override examples = [
    '# Create a compressed NFT using the wizard (tree selection in wizard)',
    '$ mplx bg nft create --wizard',
    '',
    '# Complete workflow: Create Core collection, tree, then compressed NFTs',
    '$ mplx core collection create --wizard',
    '$ mplx bg tree create --wizard',
    '$ mplx bg nft create --wizard',
    '',
    '# Create with specific tree using wizard',
    '$ mplx bg nft create my-tree --wizard',
    '',
    '# Create with existing metadata URI',
    '$ mplx bg nft create 9hRv... --name "My NFT" --uri https://example.com/meta.json',
    '',
    '# Create with local files',
    '$ mplx bg nft create dev-tree --image ./nft.png --json ./metadata.json',
  ]

  static override args = {
    tree: Args.string({
      description: 'Tree name (saved) or Merkle tree address where the NFT will be created (optional in wizard mode)',
      required: false,
    }),
  }

  static override flags = {
    wizard: OclifFlags.boolean({
      description: 'Use interactive wizard to upload media, metadata, and create NFT',
      required: false,
    }),
    // Manual creation flags
    name: OclifFlags.string({
      description: 'NFT name (required for non-wizard flows)',
      exclusive: ['wizard', 'json'],
    }),
    uri: OclifFlags.string({
      description: 'Existing metadata URI',
      exclusive: ['wizard', 'json', 'image', 'attributes', 'description', 'animation', 'project-url'],
    }),
    json: OclifFlags.string({
      description: 'Path to JSON metadata file (requires --image to upload media)',
      exclusive: ['wizard', 'name', 'uri', 'attributes', 'description', 'project-url', 'animation'],
      dependsOn: ['image'],
    }),
    image: OclifFlags.string({
      description: 'Path to image file to upload and include in metadata',
      exclusive: ['wizard', 'uri'],
    }),
    attributes: OclifFlags.string({
      description: 'Attributes in "trait:value,trait:value" format (manual mode)',
      exclusive: ['wizard', 'uri', 'json'],
    }),
    description: OclifFlags.string({
      description: 'NFT description (manual mode)',
      exclusive: ['wizard', 'uri', 'json'],
    }),
    animation: OclifFlags.string({
      description: 'Optional animation/media file path',
      exclusive: ['wizard', 'uri', 'json'],
    }),
    'project-url': OclifFlags.string({
      description: 'External project URL',
      exclusive: ['wizard', 'uri', 'json'],
    }),
    symbol: OclifFlags.string({
      description: 'Optional symbol stored on-chain (defaults to empty)',
    }),
    royalties: OclifFlags.integer({
      description: 'Royalty percentage for secondary sales (0-100)',
      min: 0,
      max: 100,
    }),
    collection: OclifFlags.string({
      description: 'Collection mint address (verifies NFT into collection)',
    }),
    owner: OclifFlags.string({
      description: 'Leaf owner public key (defaults to payer)',
    }),
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(BgNftCreate)
    const { umi, explorer } = this.context

    // Handle tree selection
    let treeInput = args.tree
    if (!treeInput) {
      if (flags.wizard) {
        // In wizard mode, prompt for tree selection
        const network = this.getNetworkLabel(this.context.chain)
        const treeSelection = await selectTreePrompt(network as NetworkLabel)
        treeInput = treeSelection.tree
      } else {
        // Not in wizard mode, tree is required
        this.error(
          'Tree argument is required when not using wizard mode.\n' +
            'Usage: mplx bg nft create <tree-name-or-address> [flags]\n' +
            'Or use wizard mode: mplx bg nft create --wizard'
        )
      }
    }

    const resolvedTree = this.resolveMerkleTree(treeInput)
    const leafOwner = this.resolveOwner(flags.owner)

    const metadata = await this.resolveMetadata(flags)
    const royaltyPercentage = metadata.sellerFeePercentage ?? flags.royalties ?? 0
    const metadataArgs = this.buildMetadataArgs({
      name: metadata.name,
      uri: metadata.uri,
      symbol: flags.symbol,
      collection: flags.collection ?? metadata.collection,
      sellerFeePercentage: royaltyPercentage,
    })

    const mintBuilder = mintV2(umi, {
      merkleTree: resolvedTree.publicKey,
      leafOwner,
      metadata: metadataArgs,
    })

    const spinner = ora('Creating compressed NFT...').start()
    try {
      const result = await umiSendAndConfirmTransaction(umi, mintBuilder)
      const rawSignature = result.transaction.signature as TransactionSignature
      const signature = txSignatureToString(rawSignature)
      spinner.succeed('Compressed NFT created successfully!')

      const assetId = await this.tryDeriveAssetId({
        signature: rawSignature,
        merkleTree: resolvedTree.publicKey,
      })

      this.printSummary({
        signature,
        owner: leafOwner.toString(),
        tree: resolvedTree.label,
        assetId,
      })

      if (this.jsonEnabled()) {
        this.logJson({
          signature,
          explorer: generateExplorerUrl(explorer, this.context.chain, signature, 'transaction'),
          assetId,
          owner: leafOwner.toString(),
          tree: resolvedTree.publicKey.toString(),
        })
      }
    } catch (error) {
      spinner.fail('Failed to create compressed NFT.')
      throw error
    }
  }

  private resolveOwner(ownerFlag?: string): PublicKey {
    if (!ownerFlag) {
      return this.context.signer.publicKey
    }

    return this.parsePublicKey('owner', ownerFlag)
  }

  private getNetworkLabel(chain: RpcChain): NetworkLabel {
    switch (chain) {
      case RpcChain.Mainnet:
        return 'mainnet'
      case RpcChain.Devnet:
        return 'devnet'
      default:
        return 'localnet'
    }
  }

  private resolveMerkleTree(treeInput: string): { publicKey: PublicKey; label: string } {
    const network = this.getNetworkLabel(this.context.chain)
    const storedTree = getTreeByNameOrAddress(treeInput, network as NetworkLabel)

    if (storedTree) {
      try {
        return { publicKey: publicKey(storedTree.address), label: storedTree.name }
      } catch {
        this.error(`Saved tree "${storedTree.name}" has an invalid address. Please update your trees.json file.`)
      }
    }

    try {
      return { publicKey: publicKey(treeInput), label: treeInput }
    } catch {
      this.error(
        `Could not find a tree named "${treeInput}" on ${network}, and the value is not a valid public key. ` +
          'Use "mplx bg tree list" to see saved trees or provide a Merkle tree address.',
      )
    }
  }

  private async resolveMetadata(flags: CommandFlags<typeof BgNftCreate>): Promise<MetadataResolution> {
    if (flags.wizard) {
      const wizardData = await createBubblegumMetadataPrompt(this.context.umi)
      const uri = await this.createAndUploadMetadata(this.context.umi, wizardData)
      return {
        name: wizardData.name,
        uri,
        sellerFeePercentage: wizardData.sellerFeePercentage,
        collection: wizardData.collection,
      }
    }

    if (flags.json) {
      return await this.handleFileBasedCreation(this.context.umi, flags.image!, flags.json, flags.collection)
    }

    if (flags.name && flags.uri) {
      return { name: flags.name, uri: flags.uri, sellerFeePercentage: flags.royalties, collection: flags.collection }
    }

    if (flags.name && flags.image) {
      const uri = await this.createMetadataFromFlags(this.context.umi, flags)
      return { name: flags.name, uri, sellerFeePercentage: flags.royalties, collection: flags.collection }
    }

    this.error(
      'You must provide one of the following combinations:\n' +
        '  --wizard\n' +
        '  --image and --json\n' +
        '  --name and --uri\n' +
        '  --name and --image (with metadata flags)',
    )
  }

  private buildMetadataArgs(input: {
    name: string
    uri: string
    symbol?: string
    sellerFeePercentage?: number
    collection?: string
  }) {
    const sellerFeeBasisPoints = Math.round((input.sellerFeePercentage ?? 0) * 100)
    const collectionPubkey = input.collection
      ? some(this.parsePublicKey('collection', input.collection))
      : none<PublicKey>()

    return {
      name: input.name,
      symbol: input.symbol ?? '',
      uri: input.uri,
      sellerFeeBasisPoints,
      primarySaleHappened: false,
      isMutable: true,
      tokenStandard: some(TokenStandard.NonFungible),
      collection: collectionPubkey,
      creators: [
        {
          address: this.context.signer.publicKey,
          verified: true,
          share: 100,
        },
      ],
    }
  }

  private async tryDeriveAssetId(params: {
    signature: TransactionSignature
    merkleTree: PublicKey
  }): Promise<string | undefined> {
    try {
      const leaf = await parseLeafFromMintV2Transaction(this.context.umi, params.signature)

      const leafIndex = Number(leaf.nonce)
      const [assetId] = findLeafAssetIdPda(this.context.umi, {
        merkleTree: params.merkleTree,
        leafIndex,
      })

      return assetId.toString()
    } catch (error) {
      this.warn(`Created successfully but failed to derive asset ID: ${(error as Error).message}`)
      return undefined
    }
  }

  private parseAttributes(attributesString?: string) {
    if (!attributesString) return []

    const attributes = []
    const segments = attributesString.split(',')

    for (const segment of segments) {
      const trimmedSegment = segment.trim()
      if (!trimmedSegment) continue

      const colonIndex = trimmedSegment.indexOf(':')
      if (colonIndex === -1) {
        throw new Error(`Invalid attribute format: "${trimmedSegment}". Expected "trait:value"`)
      }

      const trait_type = trimmedSegment.substring(0, colonIndex).trim()
      const value = trimmedSegment.substring(colonIndex + 1).trim()

      if (!trait_type || !value) {
        throw new Error(`Invalid attribute pair: "${trimmedSegment}"`)
      }

      attributes.push({ trait_type, value })
    }

    return attributes
  }

  private async createMetadataFromFlags(umi: Umi, flags: CommandFlags<typeof BgNftCreate>) {
    let imageUri = ''
    let imageMimeType = ''

    if (flags.image) {
      const imageSpinner = ora('Uploading image...').start()
      const imageResult = await uploadFile(umi, flags.image).catch((err) => {
        imageSpinner.fail(`Failed to upload image. ${err}`)
        throw err
      })
      imageSpinner.succeed(`Image uploaded to ${imageResult.uri}`)
      imageUri = imageResult.uri
      imageMimeType = imageResult.mimeType || mime.getType(flags.image) || 'application/octet-stream'
    }

    const attributes = this.parseAttributes(flags.attributes)

    const metadata = {
      name: flags.name,
      description: flags.description || '',
      external_url: flags['project-url'] || '',
      attributes,
      image: imageUri,
      properties: {
        files: imageUri
          ? [
              {
                uri: imageUri,
                type: imageMimeType,
              },
            ]
          : [],
      },
    }

    const jsonSpinner = ora('Uploading metadata...').start()
    const jsonUri = await uploadJson(umi, metadata).catch((err) => {
      jsonSpinner.fail(`Failed to upload metadata. ${err}`)
      throw err
    })
    jsonSpinner.succeed(`Metadata uploaded to ${jsonUri}`)

    return jsonUri
  }

  private async handleFileBasedCreation(umi: Umi, imagePath: string, jsonPath: string, collection?: string) {
    const expandedImagePath = untildify(imagePath)
    const expandedJsonPath = untildify(jsonPath)

    const imageSpinner = ora('Uploading image...').start()
    const imageUri = await uploadFile(umi, expandedImagePath).catch((err) => {
      imageSpinner.fail(`Failed to upload image. ${err}`)
      throw err
    })
    imageSpinner.succeed(`Image uploaded to ${imageUri.uri}`)

    const jsonFile = JSON.parse(fs.readFileSync(expandedJsonPath, 'utf-8'))
    jsonFile.image = imageUri.uri
    if (jsonFile.properties?.files?.length) {
      jsonFile.properties.files[0] = {
        uri: imageUri.uri,
        type: imageUri.mimeType,
      }
    }

    const jsonSpinner = ora('Uploading JSON...').start()
    const jsonUri = await uploadJson(umi, jsonFile).catch((err) => {
      jsonSpinner.fail(`Failed to upload json. ${err}`)
      throw err
    })
    jsonSpinner.succeed(`Metadata uploaded to ${jsonUri}`)

    const jsonRoyaltyBps =
      typeof jsonFile.seller_fee_basis_points === 'number' ? jsonFile.seller_fee_basis_points / 100 : undefined

    return {
      name: jsonFile.name,
      uri: jsonUri,
      sellerFeePercentage: jsonRoyaltyBps,
      collection: collection ?? jsonFile.collection,
    }
  }

  private async createAndUploadMetadata(umi: Umi, wizard: CreateBubblegumMetadataPromptResult, additionalAttributes?: any[]) {
    const imageSpinner = ora('Uploading image...').start()
    const imageResult = await uploadFile(umi, wizard.image).catch((err) => {
      imageSpinner.fail(`Failed to upload image. ${err}`)
      throw err
    })
    imageSpinner.succeed(`Image uploaded to ${imageResult.uri}`)

    let animationUri: string | undefined
    let animationMimeType: string | undefined
    if (wizard.animation) {
      const animationSpinner = ora('Uploading animation...').start()
      const animationResult = await uploadFile(umi, wizard.animation).catch((err) => {
        animationSpinner.fail(`Failed to upload animation. ${err}`)
        throw err
      })
      animationSpinner.succeed(`Animation uploaded to ${animationResult.uri}`)
      animationUri = animationResult.uri
      animationMimeType = animationResult.mimeType || mime.getType(wizard.animation) || 'application/octet-stream'
    }

    const allAttributes = [...(wizard.attributes || []), ...(additionalAttributes || [])]
    const imageMimeType = imageResult.mimeType || mime.getType(wizard.image) || 'application/octet-stream'

    const metadata = {
      name: wizard.name,
      description: wizard.description,
      external_url: wizard.external_url,
      attributes: allAttributes,
      image: imageResult.uri,
      animation_url: animationUri,
      properties: {
        files: [
          {
            uri: imageResult.uri,
            type: imageMimeType,
          },
          ...(animationUri
            ? [
                {
                  uri: animationUri,
                  type: animationMimeType || 'application/octet-stream',
                },
              ]
            : []),
        ],
        category: wizard.nftType,
      },
    }

    const jsonSpinner = ora('Uploading metadata...').start()
    const jsonUri = await uploadJson(umi, metadata).catch((err) => {
      jsonSpinner.fail(`Failed to upload metadata. ${err}`)
      throw err
    })
    jsonSpinner.succeed(`Metadata uploaded to ${jsonUri}`)

    return jsonUri
  }

  private printSummary(summary: CreateResultSummary) {
    this.log(`
--------------------------------
Compressed NFT Created!

Tree: ${summary.tree}
Owner: ${summary.owner}
${summary.assetId ? `Asset ID: ${summary.assetId}\n` : ''}Signature: ${summary.signature}
Explorer: ${generateExplorerUrl(this.context.explorer, this.context.chain, summary.signature, 'transaction')}
--------------------------------`)
  }

  private parsePublicKey(label: string, value: string): PublicKey {
    try {
      return publicKey(value)
    } catch {
      const errorMsg = `Invalid ${label} public key: ${value}`
      const hint = label === 'collection'
        ? '\nTip: Create a Metaplex Core collection with: mplx core collection create --wizard'
        : ''
      this.error(errorMsg + hint)
    }
  }
}
