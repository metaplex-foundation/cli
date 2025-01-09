import {TransactionBuilder, Umi} from '@metaplex-foundation/umi'
import {UmiSendAllOptions} from './sendOptions.js'
import umiSendTransaction, {UmiTransactionResponce} from './sendTransaction.js'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const umiSendAllTransactions = async (
  umi: Umi,
  transactions: TransactionBuilder[],
  options?: UmiSendAllOptions,
  onProgress?: () => void,
): Promise<UmiTransactionResponce[]> => {
  const batchDefaultSize = options?.batchSize || 5
  const transactionsPerSecond = 1 // Set default to 5 TPS
  const batchInterval = 1000 / transactionsPerSecond // Time between sending transactions (in ms)

  let results: UmiTransactionResponce[] = []
  const transactionBatches: TransactionBuilder[][] = []

  // Batch transactions in groups of the specified batch size (default is 5)
  for (let i = 0; i < transactions.length; i += batchDefaultSize) {
    const transactionBatch = transactions.slice(i, i + batchDefaultSize)
    transactionBatches.push(transactionBatch)
  }

  // Send batches with a delay to respect the transactions per second rate
  for (const batch of transactionBatches) {
    const batchPromises = batch.map(async (tx) => {
      if (!tx) {
        return {
          signature: null,
          blockhash: null,
          err: 'Error Building Transaction, Asset possibly already burned.',
        }
      }

      return umiSendTransaction(umi, tx, options)
        .then((response) => {
          onProgress && onProgress()
          results.push(response)
        })
        .catch((error) => {
          onProgress && onProgress()
          results.push(error)
        })
    })

    // Wait for all transactions in the batch to complete before proceeding
    await Promise.all(batchPromises)

    // Wait for the required interval before sending the next batch of transactions
    if (batchPromises.length > 0) {
      await delay(batchInterval * batchPromises.length) // Wait before sending next batch of transactions
    }
  }

  return results
}

export default umiSendAllTransactions
