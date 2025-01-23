import {create} from '@metaplex-foundation/mpl-core'
import { Signer, Umi } from '@metaplex-foundation/umi'
import { PluginData } from '../../types/pluginData.js'

interface CreateAssetOptions {
    owner: string
    plugins: PluginData[]

}

const createAssetTx = async (umi: Umi, asset: Signer, options: CreateAssetOptions = {}): Promise<CreateAssetTx> => {
  create(umi, {
    asset,
    name: assetName,
    uri: metadataUri,
    plugins: pluginConfigurationData ? mapPluginDataToArray(pluginConfigurationData) : undefined,
  })
}
