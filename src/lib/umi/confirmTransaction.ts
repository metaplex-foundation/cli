import { RpcConfirmTransactionResult, TransactionError, Umi } from '@metaplex-foundation/umi'
import { UmiSendOptions } from './sendOptions.js'
import { UmiTransactionResponse } from './sendTransaction.js'

export interface UmiTransactionConfirmationResult {
  confirmed: boolean
  error: TransactionError | null
}

const umiConfirmTransaction = async (
  umi: Umi,
  transaction: UmiTransactionResponse,
  sendOptions?: UmiSendOptions,
): Promise<UmiTransactionConfirmationResult> => {

  let confirmed = false
  let error: TransactionError | null = null

  if (!transaction.signature) {
    throw new Error('Transaction signature not found')
  }

  if (!transaction.blockhash) {
    throw new Error('Transaction blockhash not found')
  }

  const confirmation = await umi.rpc.confirmTransaction(transaction.signature as Uint8Array, {
    strategy: { type: 'blockhash', ...transaction.blockhash },
    commitment: sendOptions?.commitment || 'confirmed',
  }).then(confirmation => confirmation)
    .catch(error => {
      const result: RpcConfirmTransactionResult = { context: { slot: 0 }, value: { err: error } }
      return result
    })


  if (confirmation.value?.err && confirmation.value?.err.toString().includes('block height exceeded')) {
    const transactionResult = await umi.rpc.getTransaction(transaction.signature as Uint8Array)

    // If transaction was successful, set confirmed to true
    if (transactionResult && !transactionResult.meta.err) {
      confirmed = true
      error = null
    } else if (transactionResult) {
      error = transactionResult.meta.err || null
      confirmed = false
    } else {
      error = 'Transaction not found'
      confirmed = false
    }
  } else if (confirmation.context.slot && confirmation.context.slot > 0) {
    confirmed = true
    error = null
  } else {
    error = confirmation.value?.err || null
    confirmed = false
  }

  return {
    confirmed,
    error,
  }

}

export default umiConfirmTransaction
