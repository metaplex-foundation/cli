import {PluginData} from '../pluginData.js'
import {BaseCache, BaseCacheItem} from './baseCache.js'

export interface CreationCacheItem extends BaseCacheItem {
  assetId: string
  owner?: string
  name: string
  imageUri: string
  metadataUri: string
  pluginData?: PluginData[]
}

export interface CreateCache extends BaseCache {
  name: 'createCache'
  items: CreationCacheItem[]
  globalPlugins?: PluginData
}
