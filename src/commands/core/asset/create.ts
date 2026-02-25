import { Flags } from '@oclif/core'

import fs from 'node:fs'
import ora from 'ora'

import { generateSigner, publicKey, Umi } from '@metaplex-foundation/umi'
import { ExplorerType, generateExplorerUrl } from '../../../explorers.js'
import createAssetFromArgs, { AssetCreationResult } from '../../../lib/core/create/createAssetFromArgs.js'
import { Plugin, PluginData } from '../../../lib/types/pluginData.js'
import uploadFile from '../../../lib/uploader/uploadFile.js'
import uploadJson from '../../../lib/uploader/uploadJson.js'
import pluginConfigurator from '../../../prompts/pluginInquirer.js'
import { PluginFilterType, pluginSelector } from '../../../prompts/pluginSelector.js'
import { TransactionCommand } from '../../../TransactionCommand.js'
import createAssetPrompt, { NftType } from '../../../prompts/createAssetPrompt.js'


export default class AssetCreate extends TransactionCommand<typeof AssetCreate> {
  static override description = `Create an MPL Core Asset using 3 different methods:

  1. Simple Creation: Create a single Asset by providing the name and URI of the metadata.
     Example: mplx core asset create --name "My NFT" --uri "https://example.com/metadata.json"

  2. File-based Creation: Create a single Asset by providing an image file and a JSON metadata file.
     Example: mplx core asset create --files --image "./my-nft.png" --json "./metadata.json"

  3. Interactive Wizard: Create an Asset using the interactive wizard which guides you through the process.
     Example: mplx core asset create --wizard

  Additional Options:
  - Use --collection to specify a collection ID for the asset
  - Use --owner to mint the asset directly to a specific wallet address (defaults to the signer)
  - Use --plugins to interactively select and configure plugins
  - Use --pluginsFile to provide plugin configuration from a JSON file
  `

  static override examples = [
    '$ mplx core asset create --wizard',
    '$ mplx core asset create --name "My NFT" --uri "https://example.com/metadata.json"',
    '$ mplx core asset create --files --image "./my-nft.png" --json "./metadata.json"',
    '$ mplx core asset create --name "My NFT" --uri "https://example.com/metadata.json" --collection "collection_id_here"',
    '$ mplx core asset create --files --image "./my-nft.png" --json "./metadata.json" --collection "collection_id_here"',
    '$ mplx core asset create --name "My NFT" --uri "https://example.com/metadata.json" --owner "recipient_address_here"',
  ]

  static override usage = 'core asset create [FLAGS]'

  static override flags = {
    wizard: Flags.boolean({ description: 'Use interactive wizard to create asset', required: false }),
    // Simple asset creation flags
    name: Flags.string({ name: 'name', description: 'Asset name', exclusive: ['wizard'] }),
    uri: Flags.string({ name: 'uri', description: 'URI of the Asset metadata', exclusive: ['wizard'] }),
    collection: Flags.string({ name: 'collection', description: 'Collection ID' }),
    owner: Flags.string({
      name: 'owner',
      description: 'Public key of the owner the Asset will be minted to. Defaults to the signer.',
      parse: async (value) => {
        try {
          publicKey(value)
        } catch {
          throw new Error(`Invalid public key for --owner: "${value}". Must be a valid base58 public key.`)
        }
        return value
      },
    }),
    // File-based asset creation flags
    files: Flags.boolean({
      name: 'files',
      summary: 'Signify that the files are being uploaded -i/--image and -j/--json are required',
      dependsOn: ['image', 'json'],
      exclusive: ['wizard'],
    }),
    image: Flags.directory({
      name: 'image',
      description: 'path to image file to upload and assign to Asset',
      dependsOn: ['files'],
      exclusive: ['--name', '--uri', 'wizard'],
      hidden: true,
    }),
    json: Flags.directory({
      name: 'json',
      dependsOn: ['files'],
      exclusive: ['name', 'uri', 'wizard'],
      hidden: true,
    }),
    // Plugin configuration flags
    plugins: Flags.boolean({
      name: 'plugins',
      required: false,
      summary: 'Use interactive plugin selection',
    }),
    pluginsFile: Flags.directory({
      name: 'pluginsFile',
      required: false,
      exclusive: ['plugins'],
      summary: 'Path to a json file with plugin data',
    }),
  }

  private async getPluginData(): Promise<PluginData | undefined> {
    const { flags } = await this.parse(AssetCreate)

    if (flags.plugins) {
      const selectedPlugins = await pluginSelector({ filter: PluginFilterType.Asset })
      if (selectedPlugins) {
        return await pluginConfigurator(selectedPlugins as Plugin[])
      }
    } else if (flags.pluginsFile) {
      try {
        return JSON.parse(fs.readFileSync(flags.pluginsFile, 'utf-8')) as PluginData
      } catch (err) {
        this.error(`Failed to read plugin data from file: ${err}`)
      }
    }
    return undefined
  }

  private async handleFileBasedCreation(umi: any, imagePath: string, jsonPath: string, collection?: string, owner?: string) {
    const imageSpinner = ora('Uploading image...').start()
    const imageUri = await uploadFile(umi, imagePath).catch((err) => {
      imageSpinner.fail(`Failed to upload image. ${err}`)
      throw err
    })
    imageSpinner.succeed(`Image uploaded to ${imageUri.uri}`)

    const jsonFile = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))
    jsonFile.image = imageUri.uri
    jsonFile.properties.files[0] = {
      uri: imageUri.uri,
      type: imageUri.mimeType,
    }

    // TODO: Removing till further conversation on if this is correct behavior
    // fs.writeFileSync(jsonPath, JSON.stringify(jsonFile, null, 2))

    const jsonSpinner = ora('Uploading JSON...').start()
    const jsonUri = await uploadJson(umi, jsonFile).catch((err) => {
      jsonSpinner.fail(`Failed to upload json. ${err}`)
      throw err
    })
    jsonSpinner.succeed(`JSON uploaded to ${jsonUri}`)

    const pluginData = await this.getPluginData()
    const assetSpinner = ora('Creating Asset...').start()
    const assetSigner = generateSigner(umi)

    const result = await createAssetFromArgs(umi, {
      assetSigner,
      name: jsonFile.name,
      uri: jsonUri,
      collection,
      owner,
      plugins: pluginData,
    }).catch((err) => {
      assetSpinner.fail(`Failed to create asset: ${err}`)
      throw err
    })

    assetSpinner.succeed('Asset created successfully')
    return result
  }

  // TODO: Fix any typings
  private async createAndUploadMetadata(umi: Umi, wizard: any) {
    // Upload image file (required)
    const imageSpinner = ora('Uploading image...').start()
    const imageResult = await uploadFile(umi, wizard.image).catch((err) => {
      imageSpinner.fail(`Failed to upload image. ${err}`)
      throw err
    })
    imageSpinner.succeed(`Image uploaded to ${imageResult.uri}`)

    // Upload animation file if provided
    let animationUri: string | undefined
    if (wizard.animation) {
      const animationSpinner = ora('Uploading animation...').start()
      const animationResult = await uploadFile(umi, wizard.animation).catch((err) => {
        animationSpinner.fail(`Failed to upload animation. ${err}`)
        throw err
      })
      animationSpinner.succeed(`Animation uploaded to ${animationResult.uri}`)
      animationUri = animationResult.uri
    }

    // Create and upload metadata JSON
    const metadata = {
      name: wizard.name,
      description: wizard.description,
      external_url: wizard.external_url,
      attributes: wizard.attributes || [],
      image: imageResult.uri,
      animation_url: animationUri,
      properties: {
        files: [
          {
            uri: imageResult.uri,
            type: 'image/png' // TODO: Get actual mime type
          },
          ...(animationUri ? [{
            uri: animationUri,
            type: {
              image: 'image/png',
              video: 'video/mp4',
              audio: 'audio/mpeg',
              model: 'model/gltf-binary'
            }[wizard.nftType as NftType]
          }] : [])
        ],
        category: wizard.nftType
      }
    }

    const jsonSpinner = ora('Uploading metadata...').start()
    const jsonUri = await uploadJson(umi, metadata).catch((err) => {
      jsonSpinner.fail(`Failed to upload metadata. ${err}`)
      throw err
    })
    jsonSpinner.succeed(`Metadata uploaded to ${jsonUri}`)

    return jsonUri
  }

  // TODO: Fix any typings
  private formatAssetResult(result: AssetCreationResult, explorer: ExplorerType): string {
    return `--------------------------------
  Asset: ${result.asset}
  Signature: ${result.signature}
  Explorer: ${generateExplorerUrl(explorer, this.context.chain, result.signature, 'transaction')}
  Core Explorer: https://core.metaplex.com/explorer/${result.asset}
--------------------------------`
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(AssetCreate)
    const { umi, explorer } = this.context

    if (flags.wizard) {
      this.log(
        `--------------------------------
    
    Welcome to the Asset Creator Wizard!

    This wizard will guide you through the process of creating a new asset.                
                
--------------------------------`
      )

      const wizardData = await createAssetPrompt()
      const pluginData = wizardData.plugins

      const jsonUri = await this.createAndUploadMetadata(umi, wizardData)

      const spinner = ora('Creating Asset...').start()
      const assetSigner = generateSigner(umi)

      const result = await createAssetFromArgs(umi, {
        assetSigner,
        name: wizardData.name,
        uri: jsonUri,
        plugins: pluginData,
        collection: wizardData.collection,
        owner: flags.owner,
      }).catch((err) => {
        spinner.fail(`Failed to create Asset. ${err}`)
        throw err
      })

      spinner.succeed('Asset created successfully')
      this.log(this.formatAssetResult(result, explorer))
    } else if (flags.files) {
      if (!flags.image || !flags.json) {
        this.error('You must provide an image --image and JSON --json file')
      }

      const result = await this.handleFileBasedCreation(umi, flags.image, flags.json, flags.collection, flags.owner)
      this.log(this.formatAssetResult(result, explorer))
    } else {
      // Create asset from name and uri flags
      if (!flags.name) {
        throw new Error('Asset name not found')
      }
      if (!flags.uri) {
        throw new Error('Asset metadata URI not found')
      }

      const pluginData = await this.getPluginData()
      const spinner = ora('Creating Asset...').start()
      const assetSigner = generateSigner(umi)

      const result = await createAssetFromArgs(umi, {
        assetSigner,
        name: flags.name,
        uri: flags.uri,
        collection: flags.collection,
        owner: flags.owner,
        plugins: pluginData,
      }).catch((err) => {
        spinner.fail(`Failed to create Asset. ${err}`)
        throw err
      })

      spinner.succeed('Asset created successfully')
      this.log(this.formatAssetResult(result, explorer))
    }
  }
}
