import {RpcConfirmTransactionResult, TransactionBuilder, Umi} from '@metaplex-foundation/umi'
import umiConfirmTransaction from './confirmTransaction.js'
import {UmiSendOptions} from './sendOptions.js'
import umiSendTransaction from './sendTransaction.js'

const umiSendAndConfirmTransaction = async (
  umi: Umi,
  transaction: TransactionBuilder,
  sendOptions?: UmiSendOptions,
): Promise<RpcConfirmTransactionResult> => {
  // TODO - Add Error handling

  // Send transaction
  const signature = await umiSendTransaction(umi, transaction, sendOptions)

  // Confirm transaction
  const res = await umiConfirmTransaction(umi, signature, sendOptions)

  return res.result
}

export default umiSendAndConfirmTransaction
