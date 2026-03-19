import { Signer, Umi } from '@metaplex-foundation/umi'
import { AssetSignerInfo } from '../Context.js'

export type AssetSignerState = {
  info: AssetSignerInfo
  authority: Signer  // Asset owner — signs the execute instruction
  payer: Signer      // Fee payer — can differ from authority via -p flag
}

const assetSignerStore = new WeakMap<Umi, AssetSignerState>()

/**
 * Umi plugin that activates asset-signer mode. Stores the asset-signer state
 * keyed by the umi instance so the send layer can wrap transactions in execute().
 *
 * Both umi.identity and umi.payer are noopSigner(PDA), so instructions are
 * built with the PDA for all accounts. The send layer uses authority as the
 * execute caller and payer as the transaction fee payer via setFeePayer().
 */
export const assetSignerPlugin = (state: AssetSignerState) => ({
  install(umi: Umi) {
    assetSignerStore.set(umi, state)
  },
})

/**
 * Reads asset-signer state for a umi instance.
 * Returns undefined when no asset-signer wallet is active.
 */
export const getAssetSigner = (umi: Umi): AssetSignerState | undefined => {
  return assetSignerStore.get(umi)
}
