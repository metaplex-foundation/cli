import { TransactionBuilder, Umi } from '@metaplex-foundation/umi'
import { UmiSendAllOptions } from './sendOptions.js'
import umiSendTransaction, { UmiTransactionResponce } from './sendTransaction.js'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const umiSendAllTransactions = async (
  umi: Umi,
  transactions: (TransactionBuilder | null)[],
  options?: UmiSendAllOptions,
  onProgress?: (index: number, response: UmiTransactionResponce) => void,
): Promise<UmiTransactionResponce[]> => {
  const transactionsPerSecond = 3 // Set default to 1 TPS
  const txInterval = 1000 / transactionsPerSecond // Time between sending transactions (in ms)
  let results: UmiTransactionResponce[] = []

  // Process transactions sequentially
  let index = 0
  for (const tx of transactions) {
    if (!tx) {
      onProgress && onProgress(index, {
        signature: null,
        blockhash: null,
        err: 'Error Building Transaction',
      })
      index++
      results.push({
        signature: null,
        blockhash: null,
        err: 'Error Building Transaction',
      })
      continue
    }

    try {
      const response = await umiSendTransaction(umi, tx, options)
      onProgress && onProgress(index, response)
      results.push(response)
    } catch (error) {
      // console.log(`Error sending Transaction ${index} from umiSendAllTransactions:`, error)
      const errorResponse = {
        signature: null,
        blockhash: null,
        err: error instanceof Error ? error.message : String(error),
      }
      onProgress && onProgress(index, errorResponse)
      results.push(errorResponse)
    }

    index++

    // Wait for the interval before processing the next transaction
    await delay(txInterval)
  }

  return results
}

export default umiSendAllTransactions
