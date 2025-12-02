import { fetchCollection } from '@metaplex-foundation/mpl-core'
import { PublicKey, Umi } from '@metaplex-foundation/umi'
import fs from 'node:fs'
import { PluginData } from '../../types/pluginData.js'
import { UmiSendAndConfirmResponse } from '../../umi/sendAllTransactionsAndConfirm.js'
import umiSendAndConfirmTransaction from '../../umi/sendAndConfirm.js'
import uploadFile from '../../uploader/uploadFile.js'
import uploadJson from '../../uploader/uploadJson.js'
import createAssetTx from './createTx.js'

interface CreateAssetWithFilesOptions {
  owner?: string
  collection?: string
  imagePath: string
  jsonPath: string
  pluginsPath?: string
}

interface CreateAssetFromFilesResult {
  asset: PublicKey
  tx: UmiSendAndConfirmResponse
}

const createAssetFromFiles = async (umi: Umi, options: CreateAssetWithFilesOptions)=> {
  // validation

  let assetName

  if (!options.imagePath && !options.jsonPath) {
    throw new Error('Missing either image or json file paths')
  }

  // upload image

  const imageUri = await uploadFile(umi, options.imagePath)

  // adjust json and upload

  const jsonFile = JSON.parse(fs.readFileSync(options.jsonPath, 'utf-8'))

  assetName = jsonFile.name

  if (!assetName) {
    throw new Error('Asset name not found in JSON file')
  }

  jsonFile.image = imageUri.uri
  jsonFile.properties.files[0] = {
    uri: imageUri.uri,
    type: imageUri.mimeType,
  }
  fs.writeFileSync(options.jsonPath, JSON.stringify(jsonFile, null, 2))

  const jsonUri = await uploadJson(umi, jsonFile)

  // load plugins if available

  const pluginData = options.pluginsPath
    ? (JSON.parse(fs.readFileSync(options.pluginsPath, 'utf-8')) as PluginData)
    : undefined

  // generate createTx

  const collection = options.collection ? await fetchCollection(umi, options.collection) : undefined

  const createTx = await createAssetTx(umi, {
    name: assetName,
    uri: jsonUri,
    collection,
    owner: options.owner,
    plugins: pluginData,
  })

  // send createTx
  const res = await umiSendAndConfirmTransaction(umi, createTx.tx)

  // return {
  //   asset: createTx.asset,
  //   tx: res,
  // }
}

export default createAssetFromFiles
