import {CollectionV1, create} from '@metaplex-foundation/mpl-core'
import {
  createGenericFile,
  createGenericFileFromJson,
  generateSigner,
  GenericFile,
  Signer,
  TransactionBuilder,
} from '@metaplex-foundation/umi'
import {Flags} from '@oclif/core'

import {JsonMetadata} from '@metaplex-foundation/mpl-token-metadata'
import {base58} from '@metaplex-foundation/umi/serializers'
import mime from 'mime'
import fs from 'node:fs'
import ora from 'ora'

import umiSendAllTransactionsAndConfirm from '../../../lib/umi/sendAllTransactionsAndConfirm.js'
import {terminalColors, txSignatureToString} from '../../../lib/util.js'
import {TransactionCommand} from '../../../TransactionCommand.js'
import {PluginFilterType, pluginSelector} from '../../../prompts/pluginSelector.js'
import pluginConfigurator, {mapPluginDataToArray} from '../../../prompts/pluginInquirer.js'
import {PluginData} from '../../../lib/types/pluginData.js'

/* 
  Create Possibilities:

  1. Create a single Asset by providing the name and URI of the metadata.

  2. Create a single Asset by providing an image file to upload and a JSON file to upload and assign to the Asset.

  3. Create multiple Assets by providing a folder path with JSON files named sequentially ie (1.json, 2.json, 3.json) containing the offchain metadata.

  4. Create multiple Assets by providing a folder path both JSON files and image files named sequentially ie (1.json, 1.png, 2.json, 2.png, 3.json, 3.png) to upload and assign to the Assets.

  TODO - For single Asset creation, allow for the user to mint multiple copies of the same Asset via a flag(s).

*/

interface AssetCreationData {
  assetSigner?: Signer
  name?: string
  imagePath?: string
  metadataPath?: string
  metadata?: JsonMetadata
  pluginsPath?: string
  pluginData?: any
  imageUri?: string
  metadataUri?: string
}

export default class AssetCreate extends TransactionCommand<typeof AssetCreate> {
  static override description = 'Create an MPL Core Asset'

  static override examples = [
    '<%= config.bin %> <%= command.id %> --name Cool Asset --uri https://example.com/metadata.json',
    '<%= config.bin %> <%= command.id %> --files --image /asset/image.png --json ./asset/metadata.json ',
    '<%= config.bin %> <%= command.id %> --files --image /asset/image.png --json ./asset/metadata.json ',
  ]

  static override usage = 'core asset create [FLAGS]'

  static override flags = {
    // new flag group
    name: Flags.string({name: 'name', description: 'Asset name'}),
    uri: Flags.string({name: 'uri', description: 'URI of the Asset metadata'}),
    collectionId: Flags.string({name: 'collection', description: 'Collection ID'}),
    // new from files group
    files: Flags.boolean({
      name: 'files',
      summary: 'Signify that the files are being uploaded -i/--image and -j/--json are required',
      description:
        'The --files -f flag allows the user to create a Core Digital asset buy providing both an image and metadata file.',
    }),
    image: Flags.directory({
      name: 'image',
      description: 'path to image file to upload and assign to Asset',
      dependsOn: ['files'],
      exclusive: ['--name', '-n', '--uri', '-u'],
      hidden: true,
    }),
    json: Flags.directory({
      name: 'json',
      description: 'path to JSON file to upload and assign to Asset',
      dependsOn: ['files'],
      exclusive: ['name', 'uri'],
      hidden: true,
    }),
    plugins: Flags.directory({name: 'plugins', description: 'Path to a json file with plugin data'}),
    directory: Flags.directory({name: 'directory', description: 'Directory of which to create Assets from'}),
  }

  public async run(): Promise<unknown> {
    const {args, flags} = await this.parse(AssetCreate)
    const {image, json, name, uri, files, plugins} = flags

    const {umi} = this.context

    let assetName = name || undefined
    let metadataUri = uri || undefined

    if (flags.directory) {
      await this.createAssetsFromDirectory(flags.directory)
      return
    }

    /* 
    
      Plugin Configuration
    
    */

    let pluginConfigurationData

    if (plugins) {
      pluginConfigurationData = JSON.parse(fs.readFileSync(plugins, 'utf-8')) as PluginData
    } else {
      const selectedPlugins = await pluginSelector(PluginFilterType.Asset)

      if (selectedPlugins) {
        pluginConfigurationData = await pluginConfigurator(selectedPlugins)
      }
    }

    /* 
    
      Files
    
    */

    if (files) {
      // if files are being uploaded then we need to check if the image and json files are provided
      if (!image || !json) {
        this.error('You must provide an image -i and JSON -j file')
      }

      // Upload the image

      const imageSpinner = ora('Uploading Image...').start()

      const imageFile = fs.readFileSync(image)
      const mimeType = mime.getType(image)
      const genericFile = createGenericFile(imageFile, image, {
        tags: mimeType ? [{name: 'mimeType', value: mimeType}] : [],
      })
      const uploadResult = await umi.uploader
        .upload([genericFile])
        .then((res) => {
          imageSpinner.succeed(`Image uploaded: ${res[0]}`)
          return res
        })
        .catch((error) => {
          imageSpinner.fail(`Error uploading image: ${error}`)
          throw error
        })

      if (!uploadResult) {
        throw new Error('Image upload failed')
      }

      const [imageUri] = uploadResult

      // Adjust the json file

      const jsonFile = JSON.parse(fs.readFileSync(json, 'utf-8'))

      assetName = jsonFile.name

      if (!assetName) {
        throw new Error('Asset name not found in JSON file')
      }

      jsonFile.image = imageUri
      jsonFile.properties.files[0] = {
        uri: imageUri,
        type: mimeType,
      }
      fs.writeFileSync(json, JSON.stringify(jsonFile, null, 2))

      // upload the json file

      const jsonSpinner = ora('Uploading Metadata...').start()

      metadataUri = await umi.uploader
        .uploadJson(jsonFile)
        .then((res) => {
          jsonSpinner.succeed(`Metadata uploaded: ${res}`)
          return res
        })
        .catch((error) => {
          jsonSpinner.fail(`Error uploading metadata: ${error}`)
          return undefined
        })
    }

    if (!metadataUri) {
      throw new Error('Metadata upload failed')
    }

    //
    // Create the Core Asset onchain.
    //

    const spinner = ora('Creating Asset...').start()

    if (!assetName) {
      throw new Error('Asset name not found')
    }

    const asset = generateSigner(umi)

    create(umi, {
      asset,
      name: assetName,
      uri: metadataUri,
      plugins: pluginConfigurationData ? mapPluginDataToArray(pluginConfigurationData) : undefined,
    })
      .sendAndConfirm(umi)
      .then((tx) => {
        const txStr = txSignatureToString(tx.signature)
        spinner.succeed(
          `Asset Created!\nAsset: ${terminalColors.FgGreen + asset.publicKey + terminalColors.FgGray}\nsignature: ${
            terminalColors.FgBlue + txStr + terminalColors.FgDefault
          }`,
        )
      })
      .catch((error) => {
        spinner.fail(`Error creating Asset: ${error}`)
        return
      })

    return
  }

  private async createAssetsFromDirectory(directory: string): Promise<void> {
    // load file list from directory

    const fileList = fs.readdirSync(directory)

    // directory must contain both image and json files but can have optional
    // pluginData files in sequential order.
    // ie. 0.png, 0.json, 0-plugins.json, 1.png, 1.json, 1-plugins.json

    // sort the files by name
    const sortedFiles = fileList.sort((a, b) => a.localeCompare(b, undefined, {numeric: true}))

    const indices = sortedFiles.map((file) => parseInt(file.split('.')[0])).filter((index) => !isNaN(index))

    // remove duplicates
    const uniqueIndices = [...new Set(indices)]

    // check if the indices are sequentials
    const isSequential = uniqueIndices.every((value, index) => value === index)

    if (!isSequential) {
      this.error('Files must be named sequentially')
    }

    // get the highest index from the sorted files
    const highestIndex = Math.max(...uniqueIndices)

    const creationData: AssetCreationData[] = []

    for (let index = 0; index <= highestIndex; index++) {
      // check if the current index has an image and metadata file

      const image = sortedFiles.filter(
        (file) =>
          file === `${index}.png` || file === `${index}.jpg` || file === `${index}.jpeg` || file === `${index}.gif`,
      )

      const metadata = sortedFiles.filter((file) => file === `${index}.json`)

      const plugins = sortedFiles.filter((file) => file === `${index}-plugins.json`)

      if (image.length > 0 && metadata.length > 0) {
        creationData.push({
          imagePath: image[0],
          metadataPath: metadata[0],
          pluginsPath: plugins.length > 0 ? plugins[0] : undefined,
        })
      }
    }

    /* 
    
      Assign Plugin Data

    */

    let globalPluginDataExists = fileList.find((file) => file === 'plugins.json')
    // TODO: Fix any
    let globalPluginData: any

    if (globalPluginDataExists) {
      this.log('Global PluginData found')
      globalPluginData = JSON.parse(fs.readFileSync(this.flags.directory + '/plugins.json', 'utf-8'))
    }

    for (const data of creationData) {
      // load individual plugin data if it exists
      if (data.pluginsPath) {
        console.log('Idividual PluginData found')
        data.pluginData = JSON.parse(fs.readFileSync(directory + '/' + data.pluginsPath, 'utf-8'))
      } else if (globalPluginData) {
        // else assign the global plugin data if it exists
        data.pluginData = globalPluginData
      }
    }

    /* 
    
      Upload
    
    */

    this.log(`Creating ${highestIndex} Assets from directory: ${directory}`)

    const imagesFileNames = creationData.map((file) => file.imagePath)

    let imageGenericFiles: GenericFile[] = []

    for (const imageName of imagesFileNames) {
      const imageFile = fs.readFileSync(directory + '/' + imageName)
      const mimeType = mime.getType(directory)
      const genericFile = createGenericFile(imageFile, directory, {
        tags: mimeType ? [{name: 'mimeType', value: mimeType}] : [],
      })

      imageGenericFiles.push(genericFile)
    }

    this.log('Uploading Images...')
    const imageUris = await this.context.umi.uploader.upload(imageGenericFiles)

    imageUris.forEach((uri, index) => {
      creationData[index].imageUri = uri
    })

    // console.log({imageUris})

    // Adjust metadata files

    let metadataJsonFiles: JsonMetadata[] = []

    this.log('Adjusting Metadata...')
    for (let i = 0; i < creationData.length; i++) {
      const {metadataPath} = creationData[i]

      const jsonFile: JsonMetadata = JSON.parse(fs.readFileSync(directory + '/' + metadataPath, 'utf-8'))
      creationData[i].metadata = jsonFile
      creationData[i].name = jsonFile.name
      jsonFile.image = imageUris[i]

      metadataJsonFiles.push(jsonFile)
    }

    // upload JSON

    const jsonGenericFiles = metadataJsonFiles.map((json, index) =>
      createGenericFileFromJson(json, creationData[index].metadataPath),
    )

    this.log('Uploading Metadata...')
    const metadataUris = await this.context.umi.uploader.upload(jsonGenericFiles)

    metadataUris.forEach((uri, index) => {
      creationData[index].metadataUri = uri
    })

    /* 
    
      Create Assets
    
    */

    // TODO Refactor multiple mappings less
    // Generate Asset Signers for each Asset
    for (const data of creationData) {
      data.assetSigner = generateSigner(this.context.umi)
    }

    const transactions = await Promise.all(creationData.map((data) => this.createAssetTransactionBuilder(data)))

    let results: any = []

    const res = await umiSendAllTransactionsAndConfirm(this.context.umi, transactions)

    res.forEach((tx, index) => {
      results.push({
        asset: creationData[index].assetSigner!.publicKey,
        signature: tx.transaction.signature && base58.deserialize(tx.transaction.signature)[0],
      })
    })

    fs.writeFileSync(directory + '/create-results.json', JSON.stringify(results))
  }

  private async createSingleAsset(image: string, json: string): Promise<void> {}

  private async createAssetTransactionBuilder(
    data: AssetCreationData,
    collection?: CollectionV1,
  ): Promise<TransactionBuilder> {
    if (!data.assetSigner) {
      throw new Error('Asset Signer not found')
    }

    if (!data.name) {
      throw new Error('Asset name not found')
    }

    if (!data.metadataUri) {
      throw new Error('Metadata URI not found')
    }

    return create(this.context.umi, {
      asset: data.assetSigner,
      name: data.name,
      uri: data.metadataUri,
      collection,
      plugins: data.pluginData ? mapPluginDataToArray(data.pluginData) : undefined,
    })
  }
}
