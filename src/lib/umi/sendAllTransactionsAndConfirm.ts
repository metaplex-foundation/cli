import { TransactionBuilder, Umi } from '@metaplex-foundation/umi'
import ora from 'ora'
import confirmAllTransactions from './confirmAllTransactions.js'
import umiSendAllTransactions from './sendAllTransactions.js'
import { UmiSendAllOptions } from './sendOptions.js'
import { UmiTransactionResponse } from './sendTransaction.js'
import { UmiTransactionConfirmationResult } from './confirmTransaction.js'


export interface UmiSendAndConfirmResponse {
  transaction: UmiTransactionResponse
  confirmation: UmiTransactionConfirmationResult | null
}

const umiSendAllTransactionsAndConfirm = async (
  umi: Umi,
  transactions: TransactionBuilder[],
  sendOptions?: UmiSendAllOptions,
  message?: string,
): Promise<Array<UmiSendAndConfirmResponse>> => {
  // Send all transactions
  const sendSpinner = ora(message || 'Sending transactions...').start()
  let sentCount = 0

  const res = await umiSendAllTransactions(umi, transactions, { ...sendOptions, commitment: 'processed' }, () => {
    sentCount++
    sendSpinner.text = `${message || 'Sending transactions'}... ${sentCount}/${transactions.length}`
  })
  sendSpinner.succeed(`Sent ${transactions.length} transactions`)

  // Confirm all transactions
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

export default umiSendAllTransactionsAndConfirm
