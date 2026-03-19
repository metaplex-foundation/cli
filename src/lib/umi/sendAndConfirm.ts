import { TransactionBuilder, Umi } from '@metaplex-foundation/umi'
import { getAssetSigner } from './assetSignerPlugin.js'
import umiConfirmTransaction from './confirmTransaction.js'
import { UmiSendAndConfirmResponse } from './sendAllTransactionsAndConfirm.js'
import { UmiSendOptions } from './sendOptions.js'
import umiSendTransaction from './sendTransaction.js'
import { wrapForAssetSigner } from './wrapForAssetSigner.js'

const umiSendAndConfirmTransaction = async (
  umi: Umi,
  transaction: TransactionBuilder,
  sendOptions?: UmiSendOptions,
): Promise<UmiSendAndConfirmResponse> => {
  // TODO - Add Error handling

  // If an asset-signer wallet is active (stored on umi via plugin),
  // wrap the instructions in execute() automatically.
  let tx = transaction
  const assetSigner = getAssetSigner(umi)
  if (assetSigner) {
    tx = await wrapForAssetSigner(umi, transaction, assetSigner.info, assetSigner.authority, assetSigner.payer)
  }

  // Send transaction
  const signature = await umiSendTransaction(umi, tx, sendOptions)
  // console.log('Signature: ', signature)

  if (signature.err) {
    throw new Error(signature.err)
  }

  // Confirm transaction
  const res = await umiConfirmTransaction(umi, signature, sendOptions)
  // console.log('Res: ', res)
  return {
    transaction: signature,
    confirmation: res,
  }
}

export default umiSendAndConfirmTransaction
