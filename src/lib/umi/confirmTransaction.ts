import { Commitment, TransactionError, Umi } from '@metaplex-foundation/umi'
import { UmiSendOptions } from './sendOptions.js'
import { UmiTransactionResponse } from './sendTransaction.js'

export interface UmiTransactionConfirmationResult {
  confirmed: boolean
  error: TransactionError | null
}

const umiConfirmTransaction = async (
  umi: Umi,
  transaction: UmiTransactionResponse,
  sendOptions?: UmiSendOptions,
  expiredBlockhashes?: Set<string>,
): Promise<UmiTransactionConfirmationResult> => {

  if (!transaction.signature) {
    throw new Error('Transaction signature not found')
  }

  if (!transaction.blockhash) {
    throw new Error('Transaction blockhash not found')
  }

  const commitment = sendOptions?.commitment || 'confirmed'

  // If this blockhash is already known to be expired, skip confirmTransaction
  // and go directly to getTransaction. This avoids redundant RPC calls during
  // large batch confirmations where many transactions share the same blockhash.
  if (expiredBlockhashes?.has(transaction.blockhash.blockhash)) {
    return confirmViaGetTransaction(umi, transaction.signature as Uint8Array, commitment)
  }

  try {
    const confirmation = await umi.rpc.confirmTransaction(transaction.signature as Uint8Array, {
      strategy: { type: 'blockhash', ...transaction.blockhash },
      commitment,
    })

    if (confirmation.value?.err) {
      // Transaction was confirmed on-chain but execution failed (e.g. program error)
      return {
        confirmed: false,
        error: confirmation.value.err,
      }
    }

    return {
      confirmed: true,
      error: null,
    }
  } catch {
    // confirmTransaction threw (block height exceeded, timeout, network error, etc.)
    // Mark this blockhash as expired so subsequent transactions with the same
    // blockhash can skip the confirmTransaction call entirely.
    expiredBlockhashes?.add(transaction.blockhash.blockhash)

    // Fall back to getTransaction to check if the transaction was actually processed.
    return confirmViaGetTransaction(umi, transaction.signature as Uint8Array, commitment)
  }
}

const confirmViaGetTransaction = async (
  umi: Umi,
  signature: Uint8Array,
  commitment: Commitment,
): Promise<UmiTransactionConfirmationResult> => {
  try {
    const transactionResult = await umi.rpc.getTransaction(signature, { commitment })

    if (transactionResult && !transactionResult.meta.err) {
      return { confirmed: true, error: null }
    } else if (transactionResult) {
      return { confirmed: false, error: transactionResult.meta.err || null }
    } else {
      return { confirmed: false, error: 'Transaction not found' }
    }
  } catch {
    return { confirmed: false, error: 'Failed to verify transaction status' }
  }
}

export default umiConfirmTransaction
