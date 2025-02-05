import {BaseCache, BaseCacheItem} from './baseCache.js'

export interface BurnCacheItem extends BaseCacheItem {
  assetId: string
  collection?: string
}

export interface CreateCache extends BaseCache {
  name: 'burnCache'
  items: BurnCacheItem[]
  collection?: string
}
