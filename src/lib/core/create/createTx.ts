import { CollectionV1, create, createV1 } from '@metaplex-foundation/mpl-core'
import { generateSigner, PublicKey, publicKey, Signer, TransactionBuilder, Umi } from '@metaplex-foundation/umi'
import { PluginData } from '../../types/pluginData.js'
import { mapPluginDataToArray } from '../../../prompts/pluginInquirer.js'

interface CreateAssetOptions {
  assetSigner?: Signer
  name: string
  uri: string
  owner?: string
  collection?: CollectionV1
  plugins?: PluginData
}

interface CreateAssetTxResult {
  asset?: PublicKey,
  tx: TransactionBuilder
}

const createAssetTx = async (umi: Umi, options: CreateAssetOptions): Promise<CreateAssetTxResult> => {
  const assetSigner = options.assetSigner || generateSigner(umi)

  const tx = create(umi, {
    asset: assetSigner,
    name: options.name,
    uri: options.uri,
    collection: options.collection,
    owner: options.owner ? publicKey(options.owner) : undefined,
    plugins: options.plugins ? mapPluginDataToArray(options.plugins) : undefined,
  })

  return {
    asset: assetSigner.publicKey,
    tx,
  }
}

export default createAssetTx
