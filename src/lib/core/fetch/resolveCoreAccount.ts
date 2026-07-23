import {
  collectionAddress,
  deserializeAssetV1,
  deserializeCollectionV1,
  Key,
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
 * Fetches the account once so RPC/transport failures propagate. Distinguishes
 * Asset vs Collection via the on-chain account key instead of catching
 * deserialize errors (which would also hide network failures).
 *
 * When `forceCollection` is set, only Collection is accepted.
 */
export async function resolveCoreAccount(
  umi: Umi,
  id: string,
  options: ResolveCoreAccountOptions = {},
): Promise<ResolvedCoreAccount> {
  const address = publicKey(id)
  const account = await umi.rpc.getAccount(address)

  if (!account.exists) {
    if (options.forceCollection) {
      throw new Error(`Unable to fetch collection at address: ${id}`)
    }
    throw new Error(`Address ${id} is neither a Core Asset nor a Core Collection`)
  }

  const accountKey = account.data[0]

  if (options.forceCollection) {
    if (accountKey !== Key.CollectionV1) {
      throw new Error(`Unable to fetch collection at address: ${id}`)
    }
    deserializeCollectionV1(account)
    return { id, isCollection: true }
  }

  if (accountKey === Key.AssetV1) {
    const asset = deserializeAssetV1(account)
    const parentCollection = collectionAddress(asset)
    return {
      id,
      isCollection: false,
      collectionId: parentCollection ? parentCollection.toString() : undefined,
    }
  }

  if (accountKey === Key.CollectionV1) {
    deserializeCollectionV1(account)
    return { id, isCollection: true }
  }

  throw new Error(`Address ${id} is neither a Core Asset nor a Core Collection`)
}

export default resolveCoreAccount
