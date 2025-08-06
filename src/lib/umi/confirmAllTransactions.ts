import { RpcConfirmTransactionResult, Umi } from '@metaplex-foundation/umi'
import confirmTransaction from './confirmTransaction.js'

import { UmiSendAllOptions } from './sendOptions.js'
import { UmiTransactionResponse } from './sendTransaction.js'
import { base58 } from '@metaplex-foundation/umi/serializers'

export interface UmiTransactionConfirmationResult {
  confirmed: boolean
  result: RpcConfirmTransactionResult
}

const confirmAllTransactions = async (
  umi: Umi,
  transactions: (UmiTransactionResponse | undefined)[],
  sendOptions?: UmiSendAllOptions,
  onProgress?: (index: number, result: UmiTransactionConfirmationResult) => void,
): Promise<UmiTransactionConfirmationResult[]> => {
  // TODO - Add batch confirmation rather than one by one

  console.log(`Confirming ${transactions.length} transactions`)

  let confirmations: UmiTransactionConfirmationResult[] = []
  

  let index = 0
  for (const transaction of transactions) {
    console.log(`Confirming transaction ${index}`)
    if (!transaction?.signature) continue

    let signature = transaction.signature
    // if passing in cache with a string signature, convert to Uint8Array
    if (typeof signature === 'string') {
      signature = base58.serialize(signature)
    }

    const res = await confirmTransaction(umi, {
      ...transaction,
      signature
    }, sendOptions)
    confirmations.push(res)
    onProgress && onProgress(index, res)
    index++
  }

  return confirmations
}

export default confirmAllTransactions
