import fs from 'node:fs'
import path from 'node:path'
import mime from 'mime'
import { createGenericFile, GenericFile, Umi } from '@metaplex-foundation/umi'

export interface UploadFileResult {
    index?: number
    fileName: string
    uri?: string
    mimeType: string
}

const BATCH_SIZE = 50
const MAX_RETRIES = 3

const uploadFiles = async (umi: Umi, filePaths: string[], onProgress?: (progress: number) => void) => {

    const files = filePaths.map(filePath => {
        const file = fs.readFileSync(filePath)
        const mimeType = mime.getType(filePath)
        return createGenericFile(file, path.basename(filePath), {
            tags: mimeType ? [{ name: 'content-type', value: mimeType }] : [],
        })
    })

    const uploadResults: UploadFileResult[] = new Array(files.length)

    // Upload in batches to avoid rate limiting.
    // Each batch makes a single price check + fund call, and the Irys uploader
    // handles concurrency internally via PromisePool.
    for (let batchStart = 0; batchStart < files.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, files.length)
        const batchFiles = files.slice(batchStart, batchEnd)

        let retryCount = 0
        let batchUris: string[] | undefined

        while (retryCount <= MAX_RETRIES) {
            try {
                batchUris = await umi.uploader.upload(batchFiles)
                break
            } catch (error) {
                retryCount++
                if (retryCount > MAX_RETRIES) {
                    const firstFile = filePaths[batchStart].split('/').pop()
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
                fileName: filePaths[globalIndex].split('/').pop() || '',
                mimeType: batchFiles[i].tags?.find(tag => tag.name === 'content-type')?.value || '',
                uri: batchUris![i],
            }
            onProgress?.(globalIndex)
        }
    }

    return uploadResults
}

export default uploadFiles
