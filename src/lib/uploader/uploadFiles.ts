import fs from 'node:fs'
import path from 'node:path'
import mime from 'mime'
import { createGenericFile, Umi } from '@metaplex-foundation/umi'

export interface UploadFileResult {
    index?: number
    fileName: string
    uri?: string
    mimeType: string
}

const BATCH_SIZE = 50
const MAX_RETRIES = 3

const uploadFiles = async (umi: Umi, filePaths: string[], onProgress?: (progress: number) => void) => {

    const uploadResults: UploadFileResult[] = new Array(filePaths.length)

    // Upload in batches to avoid rate limiting and reduce peak memory.
    // Files are read from disk per batch so only one batch is in memory at a time.
    for (let batchStart = 0; batchStart < filePaths.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, filePaths.length)
        const batchFiles = filePaths.slice(batchStart, batchEnd).map(filePath => {
            const file = fs.readFileSync(filePath)
            const mimeType = mime.getType(filePath)
            return createGenericFile(file, path.basename(filePath), {
                tags: mimeType ? [{ name: 'content-type', value: mimeType }] : [],
            })
        })

        let retryCount = 0
        let batchUris: string[] | undefined

        while (retryCount <= MAX_RETRIES) {
            try {
                batchUris = await umi.uploader.upload(batchFiles)
                break
            } catch (error) {
                retryCount++
                if (retryCount > MAX_RETRIES) {
                    const firstFile = path.basename(filePaths[batchStart])
                    throw new Error(
                        `Upload failed for batch starting at ${firstFile} after ${MAX_RETRIES} retries: ` +
                        `${error instanceof Error ? error.message : String(error)}`
                    )
                }
                const backoffDelay = Math.pow(2, retryCount) * 1000
                console.log(`Batch upload attempt ${retryCount} failed, retrying in ${backoffDelay}ms...`)
                await new Promise(resolve => setTimeout(resolve, backoffDelay))
            }
        }

        // Map batch results back to overall results
        for (let i = 0; i < batchFiles.length; i++) {
            const globalIndex = batchStart + i
            uploadResults[globalIndex] = {
                index: globalIndex,
                fileName: path.basename(filePaths[globalIndex]),
                mimeType: batchFiles[i].tags?.find(tag => tag.name === 'content-type')?.value || '',
                uri: batchUris![i],
            }
            onProgress?.(globalIndex)
        }
    }

    return uploadResults
}

export default uploadFiles
