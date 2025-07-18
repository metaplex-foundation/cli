
import { BaseCache, BaseCacheItem } from "./baseCache.js";

export interface CandyMachineCache extends BaseCache {
    name: 'candyMachine',
    configFile?: string,
    candyMachineId?: string,
    data: {
        collection?: string,
    }
    items: CandyMachineCacheItem[]
}

export interface CandyMachineCacheItem extends BaseCacheItem {
    name: string,
    uri: string,
    image: string,
    animationUrl: string,
    loaded: boolean,
}