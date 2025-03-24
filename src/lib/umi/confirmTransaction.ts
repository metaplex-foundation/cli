import { Umi } from '@metaplex-foundation/umi'
import { UmiTransactionConfirmationResult } from './confirmAllTransactions.js'
import { UmiSendOptions } from './sendOptions.js'
import { UmiTransactionResponce } from './sendTransaction.js'

const umiConfirmTransaction = async (
  umi: Umi,
  transaction: UmiTransactionResponce,
  sendOptions?: UmiSendOptions,
): Promise<UmiTransactionConfirmationResult> => {
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

  return {
    confirmed: confirmation.value.err === null,
    result: confirmation,
  }
}

export default umiConfirmTransaction
