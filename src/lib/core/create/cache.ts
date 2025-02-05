import {RpcConfirmTransactionResult} from '@metaplex-foundation/umi'
import {BlockhashWithExpiryBlockHeight} from '@solana/web3.js'

export interface CreateCoreAssetCacheItem {
  assetId: string
  owner?: string
  name: string
  imageUri: string
  metadataUri: string
  transaction: RpcConfirmTransactionResult & {blockhash?: BlockhashWithExpiryBlockHeight}
}

export interface CreateCache {
  name: 'createCoreAssetsCache'
  items: CreateCoreAssetCacheItem[]
}

export const readCache = async (path: string) => {}

export const validateCache = async (cache: CreateCache) => {}
