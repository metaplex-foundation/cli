import {RpcConfirmTransactionResult, Umi} from '@metaplex-foundation/umi'
import confirmTransaction from './confirmTransaction.js'

import {UmiSendAllOptions} from './sendOptions.js'
import {UmiTransactionResponce} from './sendTransaction.js'

export interface UmiTransactionConfirmationResult {
  confirmed: boolean
  result: RpcConfirmTransactionResult
}

const confirmAllTransactions = async (
  umi: Umi,
  transactions: UmiTransactionResponce[],
  sendOptions?: UmiSendAllOptions,
  onProgress?: () => void,
): Promise<UmiTransactionConfirmationResult[]> => {
  // TODO - Add batch confirmation rather than one by one

  let confirmations: UmiTransactionConfirmationResult[] = []

  for (const transaction of transactions) {
    if (!transaction.signature) continue

    const res = await confirmTransaction(umi, transaction, sendOptions)
    confirmations.push(res)
    onProgress && onProgress()
  }

  return confirmations
}

export default confirmAllTransactions
