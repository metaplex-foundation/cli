import {CollectionV1, create, createV1} from '@metaplex-foundation/mpl-core'
import {generateSigner, publicKey, Signer, TransactionBuilder, Umi} from '@metaplex-foundation/umi'
import {PluginData} from '../../types/pluginData.js'
import {mapPluginDataToArray} from '../../../prompts/pluginInquirer.js'

interface CreateAssetOptions {
  assetSigner?: Signer
  name: string
  uri: string
  owner?: string
  collection?: CollectionV1
  plugins?: PluginData
}

const createAssetTx = async (umi: Umi, options: CreateAssetOptions): Promise<TransactionBuilder> => {
  const assetSigner = options.assetSigner || generateSigner(umi)

  return create(umi, {
    asset: assetSigner,
    name: options.name,
    uri: options.uri,
    collection: options.collection,
    owner: options.owner ? publicKey(options.owner) : undefined,
    plugins: options.plugins ? mapPluginDataToArray(options.plugins) : undefined,
  })
}

export default createAssetTx
