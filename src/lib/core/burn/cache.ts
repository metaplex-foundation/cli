import {RpcConfirmTransactionResult} from '@metaplex-foundation/umi'
import {BlockhashWithExpiryBlockHeight} from '@solana/web3.js'

export interface BurnCoreAssetCacheItem {
  assetId: string
  transaction: RpcConfirmTransactionResult & {blockhash?: BlockhashWithExpiryBlockHeight}
}

export interface CreateCache {
  name: 'burnCoreAssetsCache'
  items: BurnCoreAssetCacheItem[]
}

export const readCache = async (path: string) => {}

export const validateCache = async (cache: CreateCache) => {}
