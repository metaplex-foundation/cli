import { TransactionBuilder, Umi } from '@metaplex-foundation/umi'
import umiConfirmTransaction from './confirmTransaction.js'
import { UmiSendAndConfirmResponse } from './sendAllTransactionsAndConfirm.js'
import { UmiSendOptions } from './sendOptions.js'
import umiSendTransaction from './sendTransaction.js'

const umiSendAndConfirmTransaction = async (
  umi: Umi,
  transaction: TransactionBuilder,
  sendOptions?: UmiSendOptions,
): Promise<UmiSendAndConfirmResponse> => {
  // TODO - Add Error handling

  // Send transaction
  const signature = await umiSendTransaction(umi, transaction, sendOptions)
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
