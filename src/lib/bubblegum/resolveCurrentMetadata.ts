import { some, unwrapOptionRecursively } from '@metaplex-foundation/umi'
import type { MetadataArgsV2Args } from '@metaplex-foundation/mpl-bubblegum'
import { SELLER_FEE_BASIS_POINTS_INHERIT } from './royalties.js'

/**
 * Leaf-canonical metadata for updateMetadataV2.
 * Prefers SDK `currentMetadata` when present (newer mpl-bubblegum);
 * otherwise rebuilds from display metadata + DAS `_raw` / inherit signals.
 */
export function resolveCurrentMetadataForUpdate(assetWithProof: {
  metadata: any
  currentMetadata?: MetadataArgsV2Args
  rpcAsset?: {
    royalty?: {
      basis_points?: number
      basis_points_raw?: number | null
      inherited?: boolean | null
    }
    creators?: Array<{ address: string; share: number; verified: boolean }>
    creators_raw?: Array<{
      address: string
      share: number
      verified: boolean
    }> | null
  }
}): MetadataArgsV2Args {
  if (assetWithProof.currentMetadata) {
    return assetWithProof.currentMetadata
  }

  const metadata = assetWithProof.metadata
  const royalty = assetWithProof.rpcAsset?.royalty
  const inherited =
    royalty?.inherited === true ||
    royalty?.basis_points_raw === SELLER_FEE_BASIS_POINTS_INHERIT ||
    metadata.sellerFeeBasisPoints === SELLER_FEE_BASIS_POINTS_INHERIT

  const sellerFeeBasisPoints =
    royalty?.basis_points_raw != null
      ? royalty.basis_points_raw
      : inherited
        ? SELLER_FEE_BASIS_POINTS_INHERIT
        : metadata.sellerFeeBasisPoints

  const creators =
    assetWithProof.rpcAsset?.creators_raw != null
      ? assetWithProof.rpcAsset.creators_raw
      : inherited
        ? []
        : metadata.creators

  const collectionData = unwrapOptionRecursively(metadata.collection)
  let collection: MetadataArgsV2Args['collection'] = null
  if (collectionData != null) {
    if (typeof collectionData === 'object' && 'key' in collectionData) {
      collection = some((collectionData as { key: string }).key as any)
    } else {
      collection = some(collectionData as any)
    }
  }

  return {
    name: metadata.name,
    symbol: metadata.symbol,
    uri: metadata.uri,
    sellerFeeBasisPoints,
    primarySaleHappened: metadata.primarySaleHappened,
    isMutable: metadata.isMutable,
    tokenStandard: metadata.tokenStandard,
    collection,
    creators,
  }
}
