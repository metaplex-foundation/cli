import {JsonMetadata} from '@metaplex-foundation/mpl-token-metadata'
import {
  createGenericFile,
  createGenericFileFromJson,
  generateSigner,
  GenericFile,
  Signer,
  Umi,
} from '@metaplex-foundation/umi'
import fs from 'node:fs'
import umiSendAllTransactionsAndConfirm from '../../umi/sendAllTransactionsAndConfirm.js'
import {base58} from '@metaplex-foundation/umi/serializers'
import createAssetTx from './createTx.js'
import mime from 'mime'
import {fetchCollection} from '@metaplex-foundation/mpl-core'

interface CreateAssetsFromDirectoryOptions {
  collection?: string
}

interface AssetData {
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

const createAssetsFromDirectory = async (
  umi: Umi,
  directoryPath: string,
  options?: CreateAssetsFromDirectoryOptions,
) => {
  // load file list from directory

  const fileList = fs.readdirSync(directoryPath)

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
    console.error('Files must be named sequentially')
  }

  // get the highest index from the sorted files
  const highestIndex = Math.max(...uniqueIndices)

  const assetDataArray: AssetData[] = []

  for (let index = 0; index <= highestIndex; index++) {
    // check if the current index has an image and metadata file

    const image = sortedFiles.filter(
      (file) =>
        file === `${index}.png` || file === `${index}.jpg` || file === `${index}.jpeg` || file === `${index}.gif`,
    )

    const metadata = sortedFiles.filter((file) => file === `${index}.json`)

    const plugins = sortedFiles.filter((file) => file === `${index}-plugins.json`)

    if (image.length > 0 && metadata.length > 0) {
      assetDataArray.push({
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
    console.log('Global PluginData found')
    globalPluginData = JSON.parse(fs.readFileSync(directoryPath + '/plugins.json', 'utf-8'))
  }

  for (const assetData of assetDataArray) {
    // load individual plugin data if it exists
    if (assetData.pluginsPath) {
      console.log('Idividual PluginData found')
      assetData.pluginData = JSON.parse(fs.readFileSync(directoryPath + '/' + assetData.pluginsPath, 'utf-8'))
    } else if (globalPluginData) {
      // else assign the global plugin data if it exists
      assetData.pluginData = globalPluginData
    }
  }

  /* 
    
      Upload
    
    */

  console.log(`Creating ${highestIndex} Assets from directory: ${directoryPath}`)

  const imagesFileNames = assetDataArray.map((file) => file.imagePath)

  let imageGenericFiles: GenericFile[] = []

  for (const imageName of imagesFileNames) {
    const imageFile = fs.readFileSync(directoryPath + '/' + imageName)
    const mimeType = mime.getType(directoryPath)
    const genericFile = createGenericFile(imageFile, directoryPath, {
      tags: mimeType ? [{name: 'mimeType', value: mimeType}] : [],
    })

    imageGenericFiles.push(genericFile)
  }

  console.log('Uploading Images...')
  const imageUris = await umi.uploader.upload(imageGenericFiles)

  imageUris.forEach((uri, index) => {
    assetDataArray[index].imageUri = uri
  })

  // console.log({imageUris})

  // Adjust metadata files

  let metadataJsonFiles: JsonMetadata[] = []

  console.log('Adjusting Metadata...')
  for (let i = 0; i < assetDataArray.length; i++) {
    const {metadataPath} = assetDataArray[i]

    const jsonFile: JsonMetadata = JSON.parse(fs.readFileSync(directoryPath + '/' + metadataPath, 'utf-8'))
    assetDataArray[i].metadata = jsonFile
    assetDataArray[i].name = jsonFile.name
    jsonFile.image = imageUris[i]

    metadataJsonFiles.push(jsonFile)
  }

  // upload JSON

  const jsonGenericFiles = metadataJsonFiles.map((json, index) =>
    createGenericFileFromJson(json, assetDataArray[index].metadataPath),
  )

  console.log('Uploading Metadata...')
  // TODO: Add Umi uploader of array of generic files
  const metadataUris = await umi.uploader.upload(jsonGenericFiles)

  metadataUris.forEach((uri, index) => {
    assetDataArray[index].metadataUri = uri
  })

  /* 
    
      Create Assets
    
    */

  // TODO Refactor multiple mappings less
  // Generate Asset Signers for each Asset
  for (const assetData of assetDataArray) {
    assetData.assetSigner = generateSigner(umi)
  }

  const collection = options?.collection ? await fetchCollection(umi, options.collection) : undefined

  const transactions = await Promise.all(
    assetDataArray.map((assetData) =>
      createAssetTx(umi, {
        assetSigner: assetData.assetSigner,
        // TODO: Fix !s, and undefineds
        name: assetData.name!,
        uri: assetData.metadataUri!,
        owner: undefined,
        collection,
        plugins: assetData.pluginData,
      }),
    ),
  )

  let results: any = []

  const res = await umiSendAllTransactionsAndConfirm(umi, transactions)

  res.forEach((tx, index) => {
    results.push({
      asset: assetDataArray[index].assetSigner!.publicKey,
      signature: tx.transaction.signature && base58.deserialize(tx.transaction.signature)[0],
    })
  })

  fs.writeFileSync(directoryPath + '/create-results.json', JSON.stringify(results))
}

export default createAssetsFromDirectory
