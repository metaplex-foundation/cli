import { UmiSendAndConfirmResponce } from '../../umi/sendAllTransactionsAndConfirm.js'
import { PluginData } from '../pluginData.js'
import { BaseCache, BaseCacheItem } from './baseCache.js'

export interface CreationCacheItem extends BaseCacheItem {
  assetId: string
  owner?: string
  name: string
  imageUri: string
  metadataUri: string
  pluginData?: PluginData[]
  tx?: UmiSendAndConfirmResponce
}

export interface CreateCache extends BaseCache {
  name: 'createCache'
  items: CreationCacheItem[]
  globalPlugins?: PluginData
}

export interface CreateAssetsFromDirectoryCache extends BaseCache {
  name: 'createAssetsFromDirectory'
  directoryPath: string
  items: CreationCacheItem[]
}
