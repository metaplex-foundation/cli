import { publicKey, PublicKey, Signer, Umi } from '@metaplex-foundation/umi'
import { AssetSignerInfo } from '../Context.js'

export type AssetSignerState = {
  info: AssetSignerInfo
  authority: Signer
}

const ASSET_SIGNER_KEY = '__assetSigner'

/**
 * Umi plugin that activates asset-signer mode. Stores the asset-signer state
 * on the umi instance so the send layer can wrap transactions in execute().
 *
 * umi.identity remains the real wallet (required for correct mpl-core account
 * resolution in CPI). Use getEffectiveOwner(umi) for address derivation.
 */
export const assetSignerPlugin = (state: AssetSignerState) => ({
  install(umi: Umi) {
    ;(umi as any)[ASSET_SIGNER_KEY] = state
  },
})

/**
 * Reads asset-signer state from a umi instance.
 * Returns undefined when no asset-signer wallet is active.
 */
export const getAssetSigner = (umi: Umi): AssetSignerState | undefined => {
  return (umi as any)[ASSET_SIGNER_KEY]
}

/**
 * Returns the effective owner for the current umi context:
 * - Asset-signer active → the PDA pubkey
 * - Normal mode → umi.identity.publicKey
 *
 * Use this for address derivation (ATA lookups, balance checks, default
 * recipients) where the result should reflect the PDA, not the gas payer.
 */
export const getEffectiveOwner = (umi: Umi): PublicKey => {
  const state = (umi as any)[ASSET_SIGNER_KEY] as AssetSignerState | undefined
  return state ? publicKey(state.info.signerPda) : umi.identity.publicKey
}
