import { TransactionBuilder, Umi } from '@metaplex-foundation/umi'
import ora from 'ora'
import confirmAllTransactions from './confirmAllTransactions.js'
import umiSendAllTransactions from './sendAllTransactions.js'
import { ConfirmationStrategy, UmiSendAllOptions } from './sendOptions.js'
import { UmiTransactionResponse } from './sendTransaction.js'
import { UmiTransactionConfirmationResult } from './confirmTransaction.js'


export interface UmiSendAndConfirmResponse {
  transaction: UmiTransactionResponse
  confirmation: UmiTransactionConfirmationResult | null
}

const DEFAULT_BATCH_SIZE = 10

const umiSendAllTransactionsAndConfirm = async (
  umi: Umi,
  transactions: TransactionBuilder[],
  sendOptions?: UmiSendAllOptions,
  message?: string,
): Promise<Array<UmiSendAndConfirmResponse>> => {
  const strategy = sendOptions?.confirmationStrategy ?? ConfirmationStrategy.blockhash

  if (strategy === ConfirmationStrategy.transactionStatus) {
    return sendAndConfirmInBatches(umi, transactions, sendOptions, message)
  }

  return sendAllThenConfirmAll(umi, transactions, sendOptions, message)
}

// Original approach: send all, then confirm all (for blockhash strategy)
const sendAllThenConfirmAll = async (
  umi: Umi,
  transactions: TransactionBuilder[],
  sendOptions?: UmiSendAllOptions,
  message?: string,
): Promise<Array<UmiSendAndConfirmResponse>> => {
  const sendSpinner = ora(message || 'Sending transactions...').start()
  let sentCount = 0

  const res = await umiSendAllTransactions(umi, transactions, { ...sendOptions, commitment: 'processed' }, () => {
    sentCount++
    sendSpinner.text = `${message || 'Sending transactions'}... ${sentCount}/${transactions.length}`
  })
  sendSpinner.succeed(`Sent ${transactions.length} transactions`)

  const confirmSpinner = ora('Confirming transactions...').start()
  let confirmedCount = 0

  const confirmations = await confirmAllTransactions(umi, res, sendOptions, () => {
    confirmedCount++
    confirmSpinner.text = `Confirming transactions... ${confirmedCount}/${res.length}`
  })
  confirmSpinner.succeed(`Confirmed ${res.length} transactions`)

  return res.map((transaction, index) => {
    return {
      transaction,
      confirmation: confirmations[index],
    }
  })
}

// Interleaved approach: send a batch, confirm that batch, repeat
// Spreads RPC load over time to avoid rate limiting
const sendAndConfirmInBatches = async (
  umi: Umi,
  transactions: TransactionBuilder[],
  sendOptions?: UmiSendAllOptions,
  message?: string,
): Promise<Array<UmiSendAndConfirmResponse>> => {
  const spinner = ora(message || 'Processing transactions...').start()
  const allResults: UmiSendAndConfirmResponse[] = []

  const batchSize = sendOptions?.batchSize ?? DEFAULT_BATCH_SIZE

  for (let i = 0; i < transactions.length; i += batchSize) {
    const batch = transactions.slice(i, i + batchSize)
    const batchLabel = `${Math.min(i + batchSize, transactions.length)}/${transactions.length}`

    // Send batch
    spinner.text = `${message || 'Sending'} ${batchLabel}...`
    const sent = await umiSendAllTransactions(umi, batch, { ...sendOptions, commitment: 'processed' })

    // Confirm batch
    spinner.text = `Confirming ${batchLabel}...`
    const confirmations = await confirmAllTransactions(umi, sent, sendOptions)

    for (let j = 0; j < sent.length; j++) {
      allResults.push({
        transaction: sent[j],
        confirmation: confirmations[j],
      })
    }
  }

  spinner.succeed(`Processed ${transactions.length} transactions`)
  return allResults
}

export default umiSendAllTransactionsAndConfirm
