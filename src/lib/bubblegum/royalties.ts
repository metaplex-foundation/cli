import { fetchCollection } from '@metaplex-foundation/mpl-core'
import { PublicKey, Umi, publicKey } from '@metaplex-foundation/umi'

/** On-chain inherit sentinel for Bubblegum V2 seller fee basis points. */
export const SELLER_FEE_BASIS_POINTS_INHERIT = 0xffff

export type LeafCreatorInput = {
  address: PublicKey
  share: number
  verified: boolean
}

export type CollectionRoyaltyInfo = {
  hasBubblegumV2: boolean
  hasRoyalties: boolean
  /** Collection Royalties plugin basis points (e.g. 500 = 5%), if present. */
  basisPoints?: number
}

export type RoyaltyMode =
  | { kind: 'inherit' }
  | {
      kind: 'explicit'
      sellerFeeBasisPoints: number
      creators: LeafCreatorInput[]
    }

/**
 * Inspect a Core collection for BubblegumV2 + Royalties plugins.
 */
export async function inspectBubblegumCollection(
  umi: Umi,
  collectionAddress: string
): Promise<CollectionRoyaltyInfo> {
  const collection = await fetchCollection(umi, publicKey(collectionAddress))
  return {
    hasBubblegumV2: Boolean(collection.bubblegumV2),
    hasRoyalties: Boolean(collection.royalties),
    basisPoints: collection.royalties?.basisPoints,
  }
}

/**
 * Parse repeated `--creator <address>:<share>` flags.
 * Shares must be integers 0–100 and sum to exactly 100.
 */
export function parseCreatorFlags(
  creators: string[] | undefined,
  identity: PublicKey
): LeafCreatorInput[] {
  if (!creators || creators.length === 0) {
    return [
      {
        address: identity,
        share: 100,
        verified: true,
      },
    ]
  }

  const parsed: LeafCreatorInput[] = []
  for (const entry of creators) {
    const colon = entry.lastIndexOf(':')
    if (colon <= 0 || colon === entry.length - 1) {
      throw new Error(
        `Invalid --creator "${entry}". Expected format: <address>:<share> (share 0-100)`
      )
    }
    const addressStr = entry.slice(0, colon).trim()
    const shareStr = entry.slice(colon + 1).trim()
    const share = Number(shareStr)
    if (!Number.isInteger(share) || share < 0 || share > 100) {
      throw new Error(
        `Invalid creator share in "${entry}". Share must be an integer from 0 to 100.`
      )
    }
    let address: PublicKey
    try {
      address = publicKey(addressStr)
    } catch {
      throw new Error(`Invalid creator address in "${entry}".`)
    }
    parsed.push({
      address,
      share,
      verified: address === identity,
    })
  }

  const total = parsed.reduce((sum, c) => sum + c.share, 0)
  if (total !== 100) {
    throw new Error(`Creator shares must sum to 100 (got ${total}).`)
  }
  return parsed
}

export function parseRoyaltyPercentage(value: string | number | undefined): number | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const num = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(num) || num < 0 || num > 100) {
    throw new Error(`Royalty percentage must be a number between 0 and 100 (got ${value}).`)
  }
  return num
}

/**
 * Decide inherit vs explicit leaf royalties from flags + collection plugins.
 *
 * Rules:
 * - `--inherit-royalties` → inherit (requires collection with Royalties)
 * - `--royalties` / explicit creators → explicit leaf SFBP
 * - collection has Royalties and no explicit override → auto-inherit
 * - otherwise → explicit (default 0% + payer @ 100% unless creators passed)
 */
export function resolveRoyaltyMode(input: {
  inheritRoyalties?: boolean
  royaltyPercentage?: number
  creators?: LeafCreatorInput[]
  hasCollection: boolean
  collectionHasRoyalties: boolean
  identity: PublicKey
}): RoyaltyMode {
  const {
    inheritRoyalties,
    royaltyPercentage,
    creators,
    hasCollection,
    collectionHasRoyalties,
    identity,
  } = input

  const hasExplicitRoyalty = royaltyPercentage !== undefined
  const hasExplicitCreators = creators !== undefined && creators.length > 0

  if (inheritRoyalties) {
    if (!hasCollection) {
      throw new Error('--inherit-royalties requires --collection.')
    }
    if (!collectionHasRoyalties) {
      throw new Error(
        'Collection does not have a Royalties plugin. Add one with --royalties when creating the collection, or use --royalties on mint for an explicit leaf rate.'
      )
    }
    if (hasExplicitRoyalty || hasExplicitCreators) {
      throw new Error(
        '--inherit-royalties cannot be combined with --royalties or --creator (leaf creators must be empty when inheriting).'
      )
    }
    return { kind: 'inherit' }
  }

  if (hasExplicitRoyalty || hasExplicitCreators) {
    const pct = royaltyPercentage ?? 0
    return {
      kind: 'explicit',
      sellerFeeBasisPoints: Math.round(pct * 100),
      creators: creators?.length
        ? creators
        : parseCreatorFlags(undefined, identity),
    }
  }

  if (hasCollection && collectionHasRoyalties) {
    return { kind: 'inherit' }
  }

  return {
    kind: 'explicit',
    sellerFeeBasisPoints: 0,
    creators: parseCreatorFlags(undefined, identity),
  }
}
