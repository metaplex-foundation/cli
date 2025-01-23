import {RpcConfirmTransactionResult} from '@metaplex-foundation/umi'
import {BlockhashWithExpiryBlockHeight} from '@solana/web3.js'

export interface BaseCacheItem {
  transaction: RpcConfirmTransactionResult & {blockhash?: BlockhashWithExpiryBlockHeight}
}

export interface BaseCache {
  name: string
  items: BaseCacheItem[]
}
