import { execute, fetchAsset, fetchCollection } from '@metaplex-foundation/mpl-core'
import { Instruction, publicKey, Signer, TransactionBuilder, Umi } from '@metaplex-foundation/umi'
import { AssetSignerInfo } from '../Context.js'

/**
 * Rewrites signer accounts in an instruction: swaps the wallet pubkey for the
 * PDA. Only isSigner accounts are rewritten so derived addresses (ATAs, PDAs)
 * and payer accounts stay correct.
 */
function rewriteSignerAuthority(ix: Instruction, walletPubkey: string, pdaPubkey: string): Instruction {
  const pda = publicKey(pdaPubkey)
  return {
    ...ix,
    keys: ix.keys.map(k =>
      k.pubkey.toString() === walletPubkey && k.isSigner
        ? { ...k, pubkey: pda }
        : k
    ),
  }
}

/**
 * Wraps a TransactionBuilder's instructions inside an MPL Core `execute` call
 * so the asset's signer PDA signs for them on-chain.
 *
 * umi.identity is the real wallet, so instructions have the wallet as
 * authority. This function rewrites signer accounts (wallet → PDA) then
 * wraps in execute() with the wallet as the caller.
 */
export const wrapForAssetSigner = async (
  umi: Umi,
  transaction: TransactionBuilder,
  assetSigner: AssetSignerInfo,
  authority: Signer,
): Promise<TransactionBuilder> => {
  const assetPubkey = publicKey(assetSigner.asset)
  const asset = await fetchAsset(umi, assetPubkey)

  let collection
  if (asset.updateAuthority.type === 'Collection' && asset.updateAuthority.address) {
    collection = await fetchCollection(umi, asset.updateAuthority.address)
  }

  const walletPubkey = authority.publicKey.toString()
  const instructions = transaction.getInstructions().map(ix =>
    rewriteSignerAuthority(ix, walletPubkey, assetSigner.signerPda)
  )

  return execute(umi, {
    asset,
    collection,
    instructions,
    authority,
  })
}
