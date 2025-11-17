import { Umi } from "@metaplex-foundation/umi";
import { CandyMachineAssetCache, CandyMachineAssetCacheItem } from "./types.js";
import uploadFiles from "../uploader/uploadFiles.js";
import path from "node:path";
import fs from "node:fs";

export interface UploadProgress {
    phase: 'images-start' | 'images' | 'images-complete' |
    'json-start' | 'json' | 'json-complete' |
    'updating-json' | 'complete'
    current?: number
    total?: number
    message: string
}

const uploadCandyMachineItems = async (
    umi: Umi,
    assetCache: CandyMachineAssetCache,
    candyMachineDir: string,
    progressHandler: (progress: UploadProgress) => void
): Promise<{ assetCache: CandyMachineAssetCache }> => {
    const assetsDirectory = path.join(candyMachineDir, 'assets')

    // Check which items need image uploads
    const itemsNeedingImageUpload: { index: number, item: CandyMachineAssetCacheItem }[] = Object.entries(assetCache.assetItems)
        .map(([index, item]) => ({ index: Number(index), item }))
        .filter(({ item }) => !item.imageUri)

    // Check which items need JSON uploads
    const itemsNeedingJsonUpload: { index: number, item: CandyMachineAssetCacheItem }[] = Object.entries(assetCache.assetItems)
        .map(([index, item]) => ({ index: Number(index), item }))
        .filter(({ item }) => !item.jsonUri)

    if (itemsNeedingImageUpload.length === 0 && itemsNeedingJsonUpload.length === 0) {
        return { assetCache }
    }

    // Upload images first
    if (itemsNeedingImageUpload.length > 0) {
        progressHandler({
            phase: 'images-start',
            total: itemsNeedingImageUpload.length,
            message: `Uploading ${itemsNeedingImageUpload.length} images...`
        })

        const imageUris = await uploadFiles(umi, itemsNeedingImageUpload.map(({ item }) => path.join(assetsDirectory, item.image!)), progress => {
            progressHandler({
                phase: 'images',
                current: progress + 1,
                total: itemsNeedingImageUpload.length,
                message: `Uploading images... ${progress + 1}/${itemsNeedingImageUpload.length}`
            })
        })

        // Update asset cache with image URIs
        itemsNeedingImageUpload.forEach(({ index, item }, i) => {
            assetCache.assetItems[index] = {
                ...item,
                imageUri: imageUris[i].uri,
                imageType: imageUris[i].mimeType
            }
        })

        progressHandler({
            phase: 'images-complete',
            message: `Uploaded ${itemsNeedingImageUpload.length} images successfully`
        })
    }

    // Update JSON files with image URIs
    if (itemsNeedingJsonUpload.length > 0) {
        progressHandler({
            phase: 'updating-json',
            message: 'Updating JSON files with image URIs...'
        })

        itemsNeedingJsonUpload.forEach(({ index, item }) => {
            if (item.json) {
                const jsonFile = JSON.parse(fs.readFileSync(path.join(assetsDirectory, item.json), 'utf8'))
                
                // Update image URI in JSON if it exists
                if (assetCache.assetItems[index].imageUri) {
                    jsonFile.image = assetCache.assetItems[index].imageUri
                    jsonFile.properties.files[0].uri = assetCache.assetItems[index].imageUri
                    jsonFile.properties.files[0].type = assetCache.assetItems[index].imageType
                }
                
                fs.writeFileSync(path.join(assetsDirectory, item.json), JSON.stringify(jsonFile, null, 2))
            }
        })
    }

    // Upload JSON files
    if (itemsNeedingJsonUpload.length > 0) {
        progressHandler({
            phase: 'json-start',
            total: itemsNeedingJsonUpload.length,
            message: `Uploading ${itemsNeedingJsonUpload.length} metadata files...`
        })

        const jsonUris = await uploadFiles(umi, itemsNeedingJsonUpload.map(({ item }) => path.join(assetsDirectory, item.json!)), progress => {
            progressHandler({
                phase: 'json',
                current: progress + 1,
                total: itemsNeedingJsonUpload.length,
                message: `Uploading metadata... ${progress + 1}/${itemsNeedingJsonUpload.length}`
            })
        })

        // Update asset cache with JSON URIs
        itemsNeedingJsonUpload.forEach(({ index, item }, i) => {
            assetCache.assetItems[index] = {
                ...assetCache.assetItems[index], // Preserve existing data (including imageUri)
                jsonUri: jsonUris[i].uri
            }
        })

        progressHandler({
            phase: 'json-complete',
            message: `Uploaded ${itemsNeedingJsonUpload.length} metadata files successfully`
        })
    }

    progressHandler({
        phase: 'complete',
        message: 'All assets uploaded successfully'
    })

    return { assetCache }
}

export default uploadCandyMachineItems