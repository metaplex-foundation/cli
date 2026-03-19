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
 * Inner signers (e.g., newly generated asset keypairs) are preserved and
 * added to the execute transaction so they can sign the outer transaction.
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

  // Collect inner signers (e.g., generated asset keypairs) that need to sign
  // the outer transaction. Exclude the PDA noop, authority, and payer since
  // execute() and setFeePayer() handle those.
  const excludeKeys = new Set([
    umi.identity.publicKey.toString(),
    payer.publicKey.toString(),
    authority.publicKey.toString(),
  ])
  const innerSigners = transaction.getSigners(umi).filter(
    s => !excludeKeys.has(s.publicKey.toString())
  )

  const execTx = execute(umi, {
    asset,
    collection,
    instructions,
    authority,
    payer,
  })

  if (innerSigners.length === 0) {
    return execTx
  }

  // Inner signers (e.g., a generated asset keypair) must sign the outer
  // transaction. getSigners() flattens all item signers, so which item
  // they're attached to doesn't matter — append to the first.
  const [first, ...rest] = execTx.items
  return execTx.setItems([
    { ...first, signers: [...first.signers, ...innerSigners] },
    ...rest,
  ])
}
