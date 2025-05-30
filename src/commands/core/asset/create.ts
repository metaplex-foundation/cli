import { Flags } from '@oclif/core'

import fs from 'node:fs'
import ora from 'ora'

import { generateSigner } from '@metaplex-foundation/umi'
import { base58 } from '@metaplex-foundation/umi/serializers'
import { ExplorerType, generateExplorerUrl } from '../../../explorers.js'
import createAssetFromArgs from '../../../lib/core/create/createAssetFromArgs.js'
import { Plugin, PluginData } from '../../../lib/types/pluginData.js'
import uploadFile from '../../../lib/uploader/uploadFile.js'
import uploadJson from '../../../lib/uploader/uploadJson.js'
import pluginConfigurator from '../../../prompts/pluginInquirer.js'
import { PluginFilterType, pluginSelector } from '../../../prompts/pluginSelector.js'
import { TransactionCommand } from '../../../TransactionCommand.js'
import createAssetPrompt, { NftType } from '../../../prompts/createAssetPrompt.js'

/* 
  Create Possibilities:

  1. Create a single Asset by providing the name and URI of the metadata.

  2. Create a single Asset by providing an image file to upload and a JSON file to upload and assign to the Asset.

  TODO - For single Asset creation, allow for the user to mint multiple copies of the same Asset via a flag(s).
*/

/* 
  Fixes:

  TODO - For some reason when including --image and --json flags without --files flag, I get a huge json message rather than a pretty error message.
*/

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
  - Use --plugins to interactively select and configure plugins
  - Use --pluginsFile to provide plugin configuration from a JSON file
  `

  static override examples = [
    '$ mplx core asset create --wizard',
    '$ mplx core asset create --name "My NFT" --uri "https://example.com/metadata.json"',
    '$ mplx core asset create --files --image "./my-nft.png" --json "./metadata.json"',
    '$ mplx core asset create --name "My NFT" --uri "https://example.com/metadata.json" --collection "collection_id_here"',
    '$ mplx core asset create --files --image "./my-nft.png" --json "./metadata.json" --collection "collection_id_here"',
  ]

  static override usage = 'core asset create [FLAGS]'

  static override flags = {
    wizard: Flags.boolean({ description: 'Use interactive wizard to create asset', required: false }),
    // Simple asset creation flags
    name: Flags.string({ name: 'name', description: 'Asset name', exclusive: ['wizard'] }),
    uri: Flags.string({ name: 'uri', description: 'URI of the Asset metadata', exclusive: ['wizard'] }),
    collection: Flags.string({ name: 'collection', description: 'Collection ID' }),
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

  private async handleFileBasedCreation(umi: any, imagePath: string, jsonPath: string, collection?: string) {
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
    fs.writeFileSync(jsonPath, JSON.stringify(jsonFile, null, 2))

    const jsonSpinner = ora('Uploading JSON...').start()
    const jsonUri = await uploadJson(umi, jsonFile).catch((err) => {
      jsonSpinner.fail(`Failed to upload json. ${err}`)
      throw err
    })
    jsonSpinner.succeed(`JSON uploaded to ${jsonUri}`)

    const pluginData = await this.getPluginData()
    const assetSpinner = ora('Creating Asset...').start()

    const result = await createAssetFromArgs(umi, {
      name: jsonFile.name,
      uri: jsonUri,
      collection,
      plugins: pluginData,
    }).catch((err) => {
      assetSpinner.fail(`Failed to create asset: ${err}`)
      throw err
    })

    assetSpinner.succeed('Asset created successfully')
    return result
  }

  private async handleWizardMetadata(umi: any, wizard: any, imageUri?: string) {
    // Create new metadata from wizard answers
    let animationUri: string | undefined

    // Upload image file (required)
    const imageSpinner = ora('Uploading image...').start()
    const imageResult = await uploadFile(umi, wizard.image).catch((err) => {
      imageSpinner.fail(`Failed to upload image. ${err}`)
      throw err
    })
    imageSpinner.succeed(`Image uploaded to ${imageResult.uri}`)
    imageUri = imageResult.uri

    // Upload animation file if provided
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
      image: imageUri,
      animation_url: animationUri,
      properties: {
        files: [
          {
            uri: imageUri,
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

  private formatAssetResult(result: any, explorer: ExplorerType): string {
    return `--------------------------------
  Asset: ${result.asset}
  Signature: ${base58.deserialize(result.signature! as Uint8Array)[0]}
  Explorer: ${generateExplorerUrl(explorer, base58.deserialize(result.signature! as Uint8Array)[0], 'transaction')}
  Core Explorer: https://core.metaplex.com/explorer/${result.asset}\n
--------------------------------`
  }

  public async run(): Promise<unknown> {
    const { flags } = await this.parse(AssetCreate)
    const { umi, explorer } = this.context

    if (flags.wizard) {
      this.log(
        `--------------------------------
    
    Welcome to the Asset Creator Wizard!

    This wizard will guide you through the process of creating a new asset.                
                
--------------------------------`
      )

      const wizard = await createAssetPrompt()
      const pluginData = await this.getPluginData()

      // Create new metadata from wizard answers
      let imageUri: string | undefined
      let animationUri: string | undefined

      // Upload image file (required)
      const imageSpinner = ora('Uploading image...').start()
      const imageResult = await uploadFile(umi, wizard.image).catch((err) => {
        imageSpinner.fail(`Failed to upload image. ${err}`)
        throw err
      })
      imageSpinner.succeed(`Image uploaded to ${imageResult.uri}`)
      imageUri = imageResult.uri

      // Upload animation file if provided
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
        image: imageUri,
        animation_url: animationUri,
        properties: {
          files: [
            {
              uri: imageUri,
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

      const spinner = ora('Creating Asset...').start()
      const assetSigner = generateSigner(umi)

      const result = await createAssetFromArgs(umi, {
        assetSigner,
        name: wizard.name,
        uri: jsonUri,
        plugins: pluginData,
        collection: wizard.collection,
      }).catch((err) => {
        spinner.fail(`Failed to create Asset. ${err}`)
        throw err
      })

      spinner.succeed('Asset created successfully')
      this.log(this.formatAssetResult(result, explorer as ExplorerType))
      return result
    } else if (flags.files) {
      if (!flags.image || !flags.json) {
        this.error('You must provide an image --image and JSON --json file')
      }

      const result = await this.handleFileBasedCreation(umi, flags.image, flags.json, flags.collection)
      this.log(this.formatAssetResult(result, explorer as ExplorerType))
      return result
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
        plugins: pluginData,
      }).catch((err) => {
        spinner.fail(`Failed to create Asset. ${err}`)
        throw err
      })

      spinner.succeed('Asset created successfully')
      this.log(this.formatAssetResult(result, explorer as ExplorerType))
      return result
    }
  }
}
