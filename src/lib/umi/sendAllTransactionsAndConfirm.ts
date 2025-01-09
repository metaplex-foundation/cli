import {TransactionBuilder, Umi} from '@metaplex-foundation/umi'
import cliProgress from 'cli-progress'
import ora from 'ora'
import confirmAllTransactions, {UmiTransactionConfirmationResult} from './confirmAllTransactions.js'
import umiSendAllTransactions from './sendAllTransactions.js'
import {UmiSendAllOptions} from './sendOptions.js'
import {UmiTransactionResponce} from './sendTransaction.js'

export interface UmiSendAndConfirmResponce {
  transaction: UmiTransactionResponce
  confirmation: UmiTransactionConfirmationResult
}

const umiSendAllTransactionsAndConfirm = async (
  umi: Umi,
  transactions: TransactionBuilder[],
  sendOptions?: UmiSendAllOptions,
): Promise<Array<UmiSendAndConfirmResponce>> => {
  // Send all transactions

  // const spinner = ora('Sending transactions...').start()

  console.log('Sending transactions...')

  const progress = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)
  progress.start(transactions.length, 0)

  const res = await umiSendAllTransactions(umi, transactions, {...sendOptions, commitment: 'processed'}, () =>
    progress.increment(),
  )
  progress.stop()

  // Confirm all transactions
  // spinner.text = 'Confirming transactions...'
  progress.update(0)

  const confirmations = await confirmAllTransactions(umi, res, sendOptions, () => progress.increment())
  progress.stop()

  // Return summary of all transactions and write failed transactions to file
  // spinner.succeed('All transactions sent and confirmed')
  
  return res.map((transaction, index) => {
    return {
      transaction,
      confirmation: confirmations[index],
    }
  })
}

export default umiSendAllTransactionsAndConfirm
