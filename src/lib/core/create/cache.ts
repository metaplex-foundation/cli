import {Blockhash, RpcConfirmTransactionResult} from '@metaplex-foundation/umi'
import {BlockhashWithExpiryBlockHeight} from '@solana/web3.js'

export interface CreationCacheItem {
  assetId: string
  owner?: string
  name: string
  imageUri: string
  metadataUri: string
  transaction: RpcConfirmTransactionResult & {blockhash?: BlockhashWithExpiryBlockHeight}
}

export interface CreateCache {
  name: 'createCache'
  items: CreationCacheItem[]
}

export const readCache = async (path: string) => {}

export const validateCache = async (cache: CreateCache) => {}


