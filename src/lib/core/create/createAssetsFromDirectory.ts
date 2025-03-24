import { fetchCollection } from '@metaplex-foundation/mpl-core'
import { JsonMetadata } from '@metaplex-foundation/mpl-token-metadata'
import {
  createGenericFile,
  createGenericFileFromJson,
  generateSigner,
  GenericFile,
  PublicKey,
  Signer,
  Umi,
} from '@metaplex-foundation/umi'
import cliProgress from 'cli-progress'
import mime from 'mime'
import fs from 'node:fs'
import confirmAllTransactions, { UmiTransactionConfirmationResult } from '../../umi/confirmAllTransactions.js'
import umiSendAllTransactions from '../../umi/sendAllTransactions.js'
import { UmiTransactionResponce } from '../../umi/sendTransaction.js'
import createAssetTx from './createTx.js'
import { base58 } from '@metaplex-foundation/umi/serializers'

interface CreateAssetsFromDirectoryOptions {
  collection?: string
}

interface AssetData {
  assetId?: PublicKey
  name?: string
  imagePath?: string
  metadataPath?: string
  metadata?: JsonMetadata
  pluginsPath?: string
  pluginData?: any
  imageUri?: string
  metadataUri?: string
  tx?: {
    transaction?: UmiTransactionResponce
    confirmation?: UmiTransactionConfirmationResult
  }
}

interface CreateAssetsFromDirectoryCache {
  name: 'createAssetsFromDirectory'
  directoryPath: string
  items: AssetData[]
}

const createAssetsFromDirectory = async (
  umi: Umi,
  directoryPath: string,
  options?: CreateAssetsFromDirectoryOptions,
) => {
  console.log(`
----------------------------------------------------------------
Creating Assets from Directory: ${directoryPath}
----------------------------------------------------------------
    `)
  // load file list from directory

  let cache: CreateAssetsFromDirectoryCache = {
    name: 'createAssetsFromDirectory',
    directoryPath,
    items: [],
  }

  const fileList = fs.readdirSync(directoryPath)

  // directory must contain both image and json files but can have optional
  // pluginData files in sequential order.
  // ie. 0.png, 0.json, 0-plugins.json, 1.png, 1.json, 1-plugins.json

  // sort the files by name
  const sortedFiles = fileList.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

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

  // const assetDataArray: AssetData[] = []

  for (let index = 0; index <= highestIndex; index++) {
    // check if the current index has an image and metadata file

    const image = sortedFiles.filter(
      (file) =>
        file === `${index}.png` || file === `${index}.jpg` || file === `${index}.jpeg` || file === `${index}.gif`,
    )

    const metadata = sortedFiles.filter((file) => file === `${index}.json`)

    const plugins = sortedFiles.filter((file) => file === `${index}-plugins.json`)

    if (image.length > 0 && metadata.length > 0) {
      cache.items.push({
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

  for (const assetData of cache.items) {
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

  const imagesFileNames = cache.items.map((file) => file.imagePath)

  let imageGenericFiles: GenericFile[] = []

  for (const imageName of imagesFileNames) {
    const imageFile = fs.readFileSync(directoryPath + '/' + imageName)
    const mimeType = mime.getType(directoryPath)
    const genericFile = createGenericFile(imageFile, directoryPath, {
      tags: mimeType ? [{ name: 'mimeType', value: mimeType }] : [],
    })

    imageGenericFiles.push(genericFile)
  }

  console.log('Uploading Images...')
  const imageProgress = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)
  imageProgress.start(imageGenericFiles.length, 0)
  const imageUris = await umi.uploader.upload(imageGenericFiles, {
    onProgress: () => {
      imageProgress.increment()
    }
  }).catch((err) => {
    throw err
  })
  imageProgress.stop()

  imageUris.forEach((uri, index) => {
    cache.items[index].imageUri = uri
  })

  // console.log({imageUris})

  // Adjust metadata files

  let metadataJsonFiles: JsonMetadata[] = []

  for (let i = 0; i < cache.items.length; i++) {
    const { metadataPath } = cache.items[i]

    const jsonFile: JsonMetadata = JSON.parse(fs.readFileSync(directoryPath + '/' + metadataPath, 'utf-8'))
    cache.items[i].metadata = jsonFile
    cache.items[i].name = jsonFile.name
    jsonFile.image = imageUris[i]

    metadataJsonFiles.push(jsonFile)
  }

  // upload JSON

  const jsonGenericFiles = metadataJsonFiles.map((json, index) =>
    createGenericFileFromJson(json, cache.items[index].metadataPath),
  )

  console.log('Uploading Metadata...')
  // TODO: Add Umi uploader of array of generic files
  const jsonProgress = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)
  jsonProgress.start(imageGenericFiles.length, 0)
  const metadataUris = await umi.uploader.upload(jsonGenericFiles, {
    onProgress: () => {
      jsonProgress.increment()
    }
  }).catch((err) => {
    throw err
  })

  jsonProgress.stop()

  metadataUris.forEach((uri, index) => {
    cache.items[index].metadataUri = uri
  })

  /* 
    
      Create Assets
    
    */

  // TODO Refactor multiple mappings less
  // Generate Asset Signers for each Asset
  // for (const assetData of cache.items) {
  //   assetData.assetSigner = generateSigner(umi)
  // }

  const collection = options?.collection ? await fetchCollection(umi, options.collection) : undefined

  const transactions = await Promise.all(
    cache.items.map(async (assetData, index) => {

      const assetSigner = generateSigner(umi)

      cache.items[index].assetId = assetSigner.publicKey

      return   await createAssetTx(umi, {
        assetSigner: assetSigner,
        // TODO: Fix !s, and undefineds
        name: assetData.name!,
        uri: assetData.metadataUri!,
        owner: undefined,
        collection,
        plugins: assetData.pluginData,
      })
    }
    
    )
  )

  // write initial cache of assetDataArray
  fs.writeFileSync(directoryPath + '/create-cache.json', JSON.stringify(cache))

  // send transactions and log progress to cache

  const sendRes = await umiSendAllTransactions(umi, transactions.map((tx) => tx.tx), undefined, (index, response) => {
    console.log(`Sent Transaction ${index} repsonses: ${JSON.stringify(response)}`)
    // add transaction to assetDataArray
    console.log(`Adding transaction to cache ${index}`)
    console.log(cache.items[index])
    cache.items[index].tx = {
      ...cache.items[index].tx,
      transaction: {
        ...response,
        signature: base58.deserialize(response.signature as Uint8Array)[0]
      }
    }

    fs.writeFileSync(directoryPath + '/create-cache.json', JSON.stringify(cache))
  })

  const confirmRes = await confirmAllTransactions(umi, sendRes, undefined, (index, response) => {
    // add confirmation to assetDataArray
    cache.items[index].tx = {
      ...cache.items[index].tx,
      confirmation: response
    }
    fs.writeFileSync(directoryPath + '/create-cache.json', JSON.stringify(cache))
  })
}

export default createAssetsFromDirectory
