import { createCollection } from '@metaplex-foundation/mpl-core'
import { generateSigner, PublicKey, Umi } from '@metaplex-foundation/umi'
import { Flags } from '@oclif/core'
import fs from 'node:fs'
import ora from 'ora'
import { Plugin, PluginData } from '../../../lib/types/pluginData.js'
import { txSignatureToString } from '../../../lib/util.js'
import pluginConfigurator, { mapPluginDataToArray } from '../../../prompts/pluginInquirer.js'
import { PluginFilterType, pluginSelector } from '../../../prompts/pluginSelector.js'
import { TransactionCommand } from '../../../TransactionCommand.js'
import { ExplorerType, generateExplorerUrl } from '../../../explorers.js'
import createAssetPrompt, { CreateAssetPromptResult } from '../../../prompts/createAssetPrompt.js'
import uploadFile from '../../../lib/uploader/uploadFile.js'
import uploadJson from '../../../lib/uploader/uploadJson.js'

export default class CoreCollectionCreate extends TransactionCommand<typeof CoreCollectionCreate> {
  static override description = `Create an MPL Core Collection using 3 different methods:

  1. Simple Creation: Create a single Collection by providing the name and URI of the metadata.
     Example: mplx core collection create --name "My Collection" --uri "https://example.com/metadata.json"

  2. File-based Creation: Create a single Collection by providing an image file and a JSON metadata file.
     Example: mplx core collection create --files --image "./my-collection.png" --json "./metadata.json"

  3. Interactive Wizard: Create a Collection using the interactive wizard which guides you through the process.
     Example: mplx core collection create --wizard

  Additional Options:
  - Use --plugins to interactively select and configure plugins
  - Use --pluginsFile to provide plugin configuration from a JSON file
  `

  static override examples = [
    '$ mplx core collection create --wizard',
    '$ mplx core collection create --name "My Collection" --uri "https://example.com/metadata.json"',
    '$ mplx core collection create --files --image "./my-collection.png" --json "./metadata.json"',
  ]

  static override usage = 'core collection create [FLAGS]'

  static override flags = {
    wizard: Flags.boolean({ description: 'Use interactive wizard to create collection', required: false }),
    // Simple collection creation flags
    name: Flags.string({ name: 'name', char: 'n', description: 'Collections name', exclusive: ['wizard'] }),
    uri: Flags.string({ name: 'uri', char: 'u', description: 'URI of the Collection metadata', exclusive: ['wizard'] }),
    // File-based collection creation flags
    files: Flags.boolean({
      name: 'files',
      char: 'f',
      summary: 'Signify that the files are being uploaded -i/--image and -j/--json are required',
      description:
        'The --files -f flag allows the user to create a Core Digital Collection by providing both an image and metadata file.',
      exclusive: ['wizard'],
    }),
    image: Flags.string({
      name: 'image',
      char: 'i',
      description: 'path to image file to upload and assign to Collection',
      dependsOn: ['files'],
      exclusive: ['--name', '-n', '--uri', '-u', 'wizard'],
      hidden: true,
    }),
    json: Flags.string({
      name: 'json',
      char: 'j',
      description: 'path to JSON file to upload and assign to Collection',
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
    pluginsFile: Flags.file({
      name: 'pluginsFile',
      required: false,
      exclusive: ['plugins'],
      summary: 'Path to a json file with plugin data',
    }),
  }

  private async getPluginData(): Promise<PluginData | undefined> {
    const { flags } = await this.parse(CoreCollectionCreate)

    if (flags.plugins) {
      const selectedPlugins = await pluginSelector({ filter: PluginFilterType.Collection })
      if (selectedPlugins) {
        return await pluginConfigurator(selectedPlugins as Plugin[])
      }
    } else if (flags.pluginsFile) {
      try {
        if (!fs.existsSync(flags.pluginsFile)) {
          throw new Error(`Plugin file not found: ${flags.pluginsFile}`)
        }
        return JSON.parse(fs.readFileSync(flags.pluginsFile, 'utf-8')) as PluginData
      } catch (err) {
        this.error(`Failed to read plugin data from file: ${err}`)
      }
    }
    return undefined
  }

  private async handleFileBasedCreation(umi: Umi, imagePath: string, jsonPath: string, explorer: ExplorerType) {
    const imageSpinner = ora('Uploading image...').start()
    const imageResult = await uploadFile(umi, imagePath).catch((err) => {
      imageSpinner.fail(`Failed to upload image. ${err}`)
      throw err
    })
    imageSpinner.succeed(`Image uploaded to ${imageResult.uri}`)

    const jsonFile = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))
    const collectionName = jsonFile.name

    if (!collectionName) {
      throw new Error('Collection name not found in JSON file')
    }

    jsonFile.image = imageResult.uri
    
    // Initialize properties and files if they don't exist
    if (!jsonFile.properties || typeof jsonFile.properties !== 'object') {
      jsonFile.properties = {}
    }
    if (!Array.isArray(jsonFile.properties.files)) {
      jsonFile.properties.files = []
    }
    
    jsonFile.properties.files[0] = {
      uri: imageResult.uri,
      type: imageResult.mimeType,
    }

    const jsonSpinner = ora('Uploading metadata...').start()
    const metadataUri = await uploadJson(umi, jsonFile).catch((err) => {
      jsonSpinner.fail(`Failed to upload metadata. ${err}`)
      throw err
    })
    jsonSpinner.succeed(`Metadata uploaded to ${metadataUri}`)

    const pluginData = await this.getPluginData()
    const spinner = ora('Creating Collection...').start()
    const collection = generateSigner(umi)

    await createCollection(umi, {
      collection,
      name: collectionName,
      uri: metadataUri,
      plugins: pluginData ? mapPluginDataToArray(pluginData) : undefined,
    })
      .sendAndConfirm(umi)
      .then(async (tx) => {
        const txStr = txSignatureToString(tx.signature)
        spinner.succeed('Collection created successfully')
        const result = await this.formatCollectionResult(collection.publicKey, txStr, explorer)
        console.log(result)
      })
      .catch((error) => {
        spinner.fail(`Error creating Collection: ${error}`)
        throw error
      })
  }

  private async createAndUploadMetadata(umi: Umi, wizard: CreateAssetPromptResult) {
    // Upload image file (required)
    const imageSpinner = ora('Uploading image...').start()
    const imageResult = await uploadFile(umi, wizard.image).catch((err) => {
      imageSpinner.fail(`Failed to upload image. ${err}`)
      throw err
    })
    imageSpinner.succeed(`Image uploaded to ${imageResult.uri}`)

    // Create and upload metadata JSON
    const metadata = {
      name: wizard.name,
      description: wizard.description,
      external_url: wizard.external_url,
      attributes: wizard.attributes || [],
      image: imageResult.uri,
      properties: {
        files: [
          {
            uri: imageResult.uri,
            type: imageResult.mimeType
          }
        ],
        category: 'image'
      }
    }

    const jsonSpinner = ora('Uploading metadata...').start()
    const metadataUri = await uploadJson(umi, metadata).catch((err) => {
      jsonSpinner.fail(`Failed to upload metadata. ${err}`)
      throw err
    })
    jsonSpinner.succeed(`Metadata uploaded to ${metadataUri}`)

    return { collectionName: wizard.name, metadataUri }
  }

  private async formatCollectionResult(collection: PublicKey, signature: string, explorer: ExplorerType): Promise<string> {
    return `--------------------------------
  Collection: ${collection}
  Signature: ${signature}
  Explorer: ${generateExplorerUrl(explorer, this.context.chain, signature, 'transaction')}
  Core Explorer: https://core.metaplex.com/explorer/${collection}
--------------------------------`
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(CoreCollectionCreate)
    const { umi, explorer } = this.context

    if (flags.wizard) {
      console.log(
        `--------------------------------
    
    Welcome to the Collection Creator Wizard!

    This wizard will guide you through the process of creating a new collection.                
                
--------------------------------`
      )

      const wizardData = await createAssetPrompt(true)
      const { collectionName, metadataUri } = await this.createAndUploadMetadata(umi, wizardData)

      const spinner = ora('Creating Collection...').start()
      const collection = generateSigner(umi)

      await createCollection(umi, {
        collection,
        name: collectionName,
        uri: metadataUri,
        plugins: wizardData.plugins ? mapPluginDataToArray(wizardData.plugins) : undefined,
      })
        .sendAndConfirm(umi)
        .then(async (tx) => {
          const txStr = txSignatureToString(tx.signature)
          spinner.succeed('Collection created successfully')
          const result = await this.formatCollectionResult(collection.publicKey, txStr, explorer)
          console.log(result)
        })
        .catch((error) => {
          spinner.fail(`Error creating Collection: ${error}`)
          throw error
        })
    } else if (flags.files) {
      if (!flags.image || !flags.json) {
        this.error('You must provide an image --image and JSON --json file')
      }

      await this.handleFileBasedCreation(umi, flags.image, flags.json, explorer)
    } else {
      // Create collection from name and uri flags
      if (!flags.name) {
        throw new Error('Collection name is required. Use --name flag')
      }
      if (!flags.uri) {
        throw new Error('Collection metadata URI is required. Use --uri flag')
      }

      const pluginData = await this.getPluginData()
      const spinner = ora('Creating Collection...').start()
      const collection = generateSigner(umi)

      await createCollection(umi, {
        collection,
        name: flags.name,
        uri: flags.uri,
        plugins: pluginData ? mapPluginDataToArray(pluginData) : undefined,
      })
        .sendAndConfirm(umi)
        .then(async (tx) => {
          const txStr = txSignatureToString(tx.signature)
          spinner.succeed('Collection created successfully')
          const result = await this.formatCollectionResult(collection.publicKey, txStr, explorer)
          console.log(result)
        })
        .catch((error) => {
          spinner.fail(`Error creating Collection: ${error}`)
          throw error
        })
    }
  }
}
