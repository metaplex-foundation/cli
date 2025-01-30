import {Signer, Umi} from '@metaplex-foundation/umi'
import createAssetTx from './createTx.js'
import {fetchCollection} from '@metaplex-foundation/mpl-core'
import {PluginData} from '../../types/pluginData.js'
import umiSendAndConfirmTransaction from '../../umi/sendAndConfirm.js'

interface CreateAssetFromArgsOptions {
  assetSigner?: Signer,
  name: string
  uri: string
  collection?: string
  owner?: string
  plugins?: PluginData
}

const createAssetFromArgs = async (umi: Umi, options: CreateAssetFromArgsOptions) => {
  const collection = options.collection ? await fetchCollection(umi, options.collection) : undefined

  const transaction = await createAssetTx(umi, {
    assetSigner: options.assetSigner,
    name: options.name,
    uri: options.uri,
    collection: collection,
    plugins: options.plugins,
  })

  return await umiSendAndConfirmTransaction(umi, transaction)
}

export default createAssetFromArgs
