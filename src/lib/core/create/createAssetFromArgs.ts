import { Signer, Umi } from '@metaplex-foundation/umi'
import createAssetTx from './createTx.js'
import { fetchCollection } from '@metaplex-foundation/mpl-core'
import { PluginData } from '../../types/pluginData.js'
import umiSendAndConfirmTransaction from '../../umi/sendAndConfirm.js'
import { txSignatureToString } from '../../util.js'

export interface AssetCreationResult {
  asset: string
  signature: string
}

interface CreateAssetFromArgsOptions {
  assetSigner?: Signer,
  name: string
  uri: string
  collection?: string
  owner?: string
  plugins?: PluginData
}

const createAssetFromArgs = async (umi: Umi, options: CreateAssetFromArgsOptions): Promise<AssetCreationResult> => {
  const collection = options.collection ? await fetchCollection(umi, options.collection) : undefined

  const transaction = await createAssetTx(umi, {
    assetSigner: options.assetSigner,
    name: options.name,
    uri: options.uri,
    collection: collection,
    plugins: options.plugins,
  })

  const res = await umiSendAndConfirmTransaction(umi, transaction.tx)

  const { signature } = res.transaction
  if (signature === null) {
    throw new Error('Transaction signature is null — transaction may not have been confirmed')
  }

  return {
    asset: transaction.asset ? transaction.asset.toString() : '',
    signature: typeof signature === 'string' ? signature : txSignatureToString(signature),
  }
}

export default createAssetFromArgs
