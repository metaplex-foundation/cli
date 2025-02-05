import {TransactionBuilder, Umi} from '@metaplex-foundation/umi'
import fs from 'node:fs'
import burnAssetTx from './burnAssetTx.js'
import umiSendAllTransactionsAndConfirm from '../../umi/sendAllTransactionsAndConfirm.js'

interface BurnBatchOptions {
  onSendStart?: () => void
  onSendProgress?: () => void
  onBurnStart?: () => void
  onConfirmProgress?: () => void
}

const burnBatch = async (
  umi: Umi,
  assets: string[],
  collection?: string,
  options?: BurnBatchOptions,
): Promise<void> => {
  console.log(`Burning ${assets.length} Assets`)

  // Map through the list of assets and create a transaction for each asset

  let buildErrors: {assetId: string; error: string}[] = []

  const transactions: (TransactionBuilder | null)[] = await Promise.all(
    assets.map(async (asset: string) => {
      const txBuilder = await burnAssetTx(umi, asset, collection).catch((error) => {
        // skipping this error for now, will be handled in the final confirmation
        buildErrors.push({assetId: asset, error: error.message})
        return null
      })
      return txBuilder
    }),
  )

  const res = await umiSendAllTransactionsAndConfirm(
    umi,
    transactions.filter((tx) => tx !== null) as TransactionBuilder[],
  )

  //vaidate all transactions were successful

  const failedTransactions = res
    .map((transaction, index) => {
      return {
        assetId: assets[index] as string,
        results: transaction,
      }
    })
    .filter((transaction) => {
      return (
        !transaction.results ||
        transaction.results.transaction.err ||
        transaction.results.confirmation?.result?.value.err
      )
    })

  buildErrors.map((error) => {
    const assetId = error.assetId

    const failedIndex = failedTransactions.findIndex((transaction) => transaction.assetId === assetId)

    failedTransactions[failedIndex].results.transaction.err = error.error
  })

  console.log('Failed Transactions:', failedTransactions.length)

  if (failedTransactions.length > 0) {
    fs.writeFileSync('failedBurns.json', JSON.stringify(failedTransactions, null, 2))
  }

  // TODO handle cache
}

export default burnBatch
