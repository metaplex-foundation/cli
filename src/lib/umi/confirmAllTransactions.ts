import { Umi } from '@metaplex-foundation/umi'
import confirmTransaction, { UmiTransactionConfirmationResult } from './confirmTransaction.js'

import { base58 } from '@metaplex-foundation/umi/serializers'
import { UmiSendAllOptions } from './sendOptions.js'
import { UmiTransactionResponse } from './sendTransaction.js'

const confirmAllTransactions = async (
  umi: Umi,
  transactions: (UmiTransactionResponse | undefined)[],
  sendOptions?: UmiSendAllOptions,
  onProgress?: (index: number, result: UmiTransactionConfirmationResult) => void,
): Promise<UmiTransactionConfirmationResult[]> => {
  // TODO - Add batch confirmation rather than one by one

  let confirmations: UmiTransactionConfirmationResult[] = []

  // Track blockhashes that are known to be expired so we can skip the
  // confirmTransaction RPC call for subsequent transactions that share the
  // same blockhash and go directly to getTransaction instead.
  const expiredBlockhashes = new Set<string>()

  let index = 0
  for (const transaction of transactions) {
    if (!transaction?.signature) {
      onProgress && onProgress(index, { confirmed: false, error: transaction?.err || 'transaction has no signature' })
      index++
      continue
    }

    let signature = transaction.signature
    // if passing in cache with a string signature, convert to Uint8Array
    if (typeof signature === 'string') {
      signature = base58.serialize(signature)
    }

    const res = await confirmTransaction(umi, {
      ...transaction,
      signature
    }, sendOptions, expiredBlockhashes)
    confirmations.push(res)
    onProgress && onProgress(index, res)
    index++
  }

  return confirmations
}

export default confirmAllTransactions
