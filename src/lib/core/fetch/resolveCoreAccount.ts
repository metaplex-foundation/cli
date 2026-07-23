import {
  collectionAddress,
  safeFetchAssetV1,
  safeFetchCollectionV1,
} from '@metaplex-foundation/mpl-core'
import { publicKey, Umi } from '@metaplex-foundation/umi'

export type ResolvedCoreAccount = {
  id: string
  isCollection: boolean
  /** Parent collection address when the account is an asset belonging to a collection */
  collectionId?: string
}

export type ResolveCoreAccountOptions = {
  /**
   * When true, only accept a Core Collection at this address.
   * Mirrors an explicit `--collection` flag override.
   */
  forceCollection?: boolean
}

/**
 * Resolve whether an address is a Core Asset or Collection.
 *
 * When `forceCollection` is set, only Collection is accepted.
 * Otherwise tries Asset first, then falls back to Collection — matching the
 * auto-detect pattern used by `genesis bucket fetch` when `--type` is omitted.
 */
export async function resolveCoreAccount(
  umi: Umi,
  id: string,
  options: ResolveCoreAccountOptions = {},
): Promise<ResolvedCoreAccount> {
  const address = publicKey(id)

  if (options.forceCollection) {
    const collection = await safeFetchCollectionV1(umi, address).catch(() => null)
    if (!collection) {
      throw new Error(`Unable to fetch collection at address: ${id}`)
    }
    return { id, isCollection: true }
  }

  const asset = await safeFetchAssetV1(umi, address).catch(() => null)
  if (asset) {
    const parentCollection = collectionAddress(asset)
    return {
      id,
      isCollection: false,
      collectionId: parentCollection ? parentCollection.toString() : undefined,
    }
  }

  const collection = await safeFetchCollectionV1(umi, address).catch(() => null)
  if (collection) {
    return { id, isCollection: true }
  }

  throw new Error(`Address ${id} is neither a Core Asset nor a Core Collection`)
}

export default resolveCoreAccount
