import { TransactionError, Umi } from '@metaplex-foundation/umi'
import { UmiSendOptions } from './sendOptions.js'
import { UmiTransactionResponce } from './sendTransaction.js'

export interface UmiTransactionConfirmationResult {
  confirmed: boolean
  error: TransactionError | null
}

const umiConfirmTransaction = async (
  umi: Umi,
  transaction: UmiTransactionResponce,
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
  })

  if (confirmation.value?.err && confirmation.value?.err.toString().includes('expired')) {
    const transactionResult = await umi.rpc.getTransaction(transaction.signature as Uint8Array)

    if (transactionResult && !transactionResult.meta.err) {
      confirmed = true
    }
  } else if (confirmation.context.slot) {
    confirmed = true
  } else {
    error = confirmation.value.err
  }

  return {
    confirmed,
    error,
  }

}

export default umiConfirmTransaction
