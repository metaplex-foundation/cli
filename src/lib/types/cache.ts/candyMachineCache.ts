
import { UmiTransactionResponce } from "../../umi/sendTransaction.js";
import { BaseCache, BaseCacheItem } from "./baseCache.js";

interface CandyMachineCache extends BaseCache {
    name: 'candyMachine',
    configFile?: string,
    candyMachineId?: string,
    data: {
        collection?: string,
    }
    items: CandyMachineCacheItem[]
}

interface CandyMachineCacheItem extends BaseCacheItem {
    name: string,
    uri: string,
    image: string,
    animationUrl: string,
    loaded: boolean,
}