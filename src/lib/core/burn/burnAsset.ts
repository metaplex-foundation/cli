import {RpcConfirmTransactionResult, Umi} from '@metaplex-foundation/umi'
import burnAssetTx from './burnAssetTx.js'
import umiSendAndConfirmTransaction from '../../umi/sendAndConfirm.js'

const burnAsset = async (umi: Umi, asset: string, collection?: string): Promise<RpcConfirmTransactionResult> => {
  
    // fetch the burn TX
  const transaction = await burnAssetTx(umi, asset, collection)

  // send transaction
  return await umiSendAndConfirmTransaction(umi, transaction)
}

export default burnAsset
