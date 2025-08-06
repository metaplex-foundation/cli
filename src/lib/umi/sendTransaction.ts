import { setComputeUnitPrice } from '@metaplex-foundation/mpl-toolbox'
import { BlockhashWithExpiryBlockHeight, Signer, TransactionBuilder, TransactionSignature, Umi } from '@metaplex-foundation/umi'
import { UmiSendOptions } from './sendOptions.js'

export interface UmiTransactionResponse {
  signature: TransactionSignature | null | string
  blockhash: BlockhashWithExpiryBlockHeight | null
  err: string | null
}

const umiSendTransaction = async (
  umi: Umi,
  tx: TransactionBuilder,
  sendOptions?: UmiSendOptions,
): Promise<UmiTransactionResponse> => {
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

  let signedTx = await transaction.buildAndSign(umi).catch((error) => {
    throw new Error(`Error building and signing transaction: ${error.message}`)
  })

  // console.log('SignedTx: ', signedTx)

  signedTx = await umi.identity.signTransaction(signedTx)

  // console.log('Umi Identity SignedTx: ', signedTx)

  return await umi.rpc
    .sendTransaction(signedTx, { commitment, skipPreflight: sendOptions?.skipPreflight })
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
