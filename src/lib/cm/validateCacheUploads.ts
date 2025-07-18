import { CandyMachineAssetCache, CandyMachineAssetCacheItem } from "./types.js"

export enum ValidateCacheUploadsOptions {
    STORAGE = 'storage',
    ONCHAIN = 'onchain'
}

const validateCacheUploads = async (assetCache: CandyMachineAssetCache, option: ValidateCacheUploadsOptions) => {
    const items = Object.values(assetCache.assetItems)

    if (option === ValidateCacheUploadsOptions.STORAGE) {
        // Validate that all items have image and JSON URIs
        for (const item of items) {
            if (!item.imageUri || !item.jsonUri) {
                throw new Error(`Item ${item.name} is missing required URIs. Image: ${item.imageUri}, JSON: ${item.jsonUri}`)
            }
        }
    }

    if (option === ValidateCacheUploadsOptions.ONCHAIN) {
        // Validate that all items have been loaded onchain
        for (const item of items) {
            if (!item.loaded) {
                throw new Error(`Item ${item.name} has not been loaded onchain`)
            }
        }
    }
}

export { validateCacheUploads }