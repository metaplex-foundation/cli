import { execute, fetchAsset, fetchCollection } from '@metaplex-foundation/mpl-core'
import { publicKey, Signer, TransactionBuilder, Umi } from '@metaplex-foundation/umi'
import { AssetSignerInfo } from '../Context.js'

/**
 * Wraps a TransactionBuilder's instructions inside an MPL Core `execute` call
 * so the asset's signer PDA signs for them on-chain.
 *
 * Since umi.identity is a noopSigner keyed to the PDA, instructions are
 * already built with the PDA as authority — no rewriting needed.
 *
 * @param authority - The asset owner (signs the execute instruction)
 * @param payer - The fee payer (can differ from authority via -p flag)
 */
export const wrapForAssetSigner = async (
  umi: Umi,
  transaction: TransactionBuilder,
  assetSigner: AssetSignerInfo,
  authority: Signer,
  payer: Signer,
): Promise<TransactionBuilder> => {
  const assetPubkey = publicKey(assetSigner.asset)
  const asset = await fetchAsset(umi, assetPubkey)

  let collection
  if (asset.updateAuthority.type === 'Collection' && asset.updateAuthority.address) {
    collection = await fetchCollection(umi, asset.updateAuthority.address)
  }

  const instructions = transaction.getInstructions()

  return execute(umi, {
    asset,
    collection,
    instructions,
    authority,
    payer,
  })
}
