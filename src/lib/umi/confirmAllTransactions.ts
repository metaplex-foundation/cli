import { Umi } from '@metaplex-foundation/umi'
import confirmTransaction, { UmiTransactionConfirmationResult } from './confirmTransaction.js'

import { base58 } from '@metaplex-foundation/umi/serializers'
import { ConfirmationStrategy, UmiSendAllOptions } from './sendOptions.js'
import { UmiTransactionResponse } from './sendTransaction.js'

const MAX_POLL_ROUNDS = 30
const POLL_INTERVAL = 2000

const confirmAllByBlockhash = async (
  umi: Umi,
  transactions: (UmiTransactionResponse | undefined)[],
  sendOptions?: UmiSendAllOptions,
  onProgress?: (index: number, result: UmiTransactionConfirmationResult) => void,
): Promise<UmiTransactionConfirmationResult[]> => {

  let confirmations: UmiTransactionConfirmationResult[] = []

  let index = 0
  for (const transaction of transactions) {
    if (!transaction?.signature) {
      onProgress && onProgress(index, { confirmed: false, error: transaction?.err || 'transaction has no signature' })
      index++
      continue
    }

    let signature = transaction.signature
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

const confirmAllByTransactionStatus = async (
  umi: Umi,
  transactions: (UmiTransactionResponse | undefined)[],
  sendOptions?: UmiSendAllOptions,
  onProgress?: (index: number, result: UmiTransactionConfirmationResult) => void,
): Promise<UmiTransactionConfirmationResult[]> => {

  const results: UmiTransactionConfirmationResult[] = new Array(transactions.length)
  const pending = new Map<number, Uint8Array>()

  // Collect all valid signatures, mark invalid ones immediately
  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i]
    if (!tx?.signature) {
      results[i] = { confirmed: false, error: tx?.err || 'transaction has no signature' }
      onProgress?.(i, results[i])
      continue
    }

    let signature = tx.signature
    if (typeof signature === 'string') {
      signature = base58.serialize(signature)
    }
    pending.set(i, signature as Uint8Array)
  }

  // Poll pending signatures in rounds until all confirmed or retries exhausted
  for (let round = 0; round < MAX_POLL_ROUNDS && pending.size > 0; round++) {
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL))

    for (const [index, signature] of pending) {
      try {
        const txResult = await umi.rpc.getTransaction(signature)

        if (txResult) {
          if (txResult.meta.err) {
            results[index] = { confirmed: false, error: txResult.meta.err }
          } else {
            results[index] = { confirmed: true, error: null }
          }
          pending.delete(index)
          onProgress?.(index, results[index])
        }
      } catch {
        // RPC error — try again next round
      }
    }
  }

  // Mark any remaining as unconfirmed
  for (const [index] of pending) {
    results[index] = { confirmed: false, error: `Transaction not confirmed after ${MAX_POLL_ROUNDS} polling rounds` }
    onProgress?.(index, results[index])
  }

  return results
}

const confirmStrategies = {
  [ConfirmationStrategy.blockhash]: confirmAllByBlockhash,
  [ConfirmationStrategy.transactionStatus]: confirmAllByTransactionStatus,
}

const confirmAllTransactions = async (
  umi: Umi,
  transactions: (UmiTransactionResponse | undefined)[],
  sendOptions?: UmiSendAllOptions,
  onProgress?: (index: number, result: UmiTransactionConfirmationResult) => void,
): Promise<UmiTransactionConfirmationResult[]> => {

  const strategy = sendOptions?.confirmationStrategy ?? ConfirmationStrategy.blockhash
  const confirm = confirmStrategies[strategy]

  return confirm(umi, transactions, sendOptions, onProgress)
}

export default confirmAllTransactions
