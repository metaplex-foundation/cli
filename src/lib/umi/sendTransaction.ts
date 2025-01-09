import { setComputeUnitPrice } from '@metaplex-foundation/mpl-toolbox'
import { BlockhashWithExpiryBlockHeight, TransactionBuilder, TransactionSignature, Umi } from '@metaplex-foundation/umi'
import { UmiSendOptions } from './sendOptions.js'

export interface UmiTransactionResponce {
  signature: TransactionSignature | null
  blockhash: BlockhashWithExpiryBlockHeight | null
  err: string | null
}

const umiSendTransaction = async (
  umi: Umi,
  tx: TransactionBuilder,
  sendOptions?: UmiSendOptions,
): Promise<UmiTransactionResponce> => {
  const commitment = sendOptions?.commitment || 'confirmed'

  const blockhash = await umi.rpc.getLatestBlockhash({
    commitment,
  })

  if (!blockhash) {
    return {
      signature: null,
      blockhash: null,
      err: 'Blockhash not found',
    }
  }

  let transaction = tx.setBlockhash(blockhash)

  if (sendOptions?.priorityFee) {
    transaction = transaction.add(
      setComputeUnitPrice(umi, {
        microLamports: 100000,
      }),
    )
  }

  const signedTx = await transaction.buildAndSign(umi).catch((error) => {
    throw new Error(`Error building and signing transaction: ${error.message}`)
  })

  return await umi.rpc
    .sendTransaction(signedTx, {commitment})
    .then((signature) => {
      return {
        signature,
        blockhash,
        err: null,
      }
    })
    .catch((error) => {
      return {
        signature: null,
        blockhash: null,
        err: error.message,
      }
    })
}

export default umiSendTransaction
