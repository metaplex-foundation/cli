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

    // Upload in batches to reduce peak memory.
    // Files are read from disk per batch so only one batch is in memory at a time.
    // Within each batch, files are uploaded individually with per-file retry logic
    // to avoid re-uploading already-persisted files on partial failures.
    for (let batchStart = 0; batchStart < filePaths.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, filePaths.length)

        for (let i = batchStart; i < batchEnd; i++) {
            const filePath = filePaths[i]
            const fileBuffer = fs.readFileSync(filePath)
            const mimeType = mime.getType(filePath)
            const file = createGenericFile(fileBuffer, path.basename(filePath), {
                tags: mimeType ? [{ name: 'content-type', value: mimeType }] : [],
            })

            let retryCount = 0

            while (retryCount <= MAX_RETRIES) {
                try {
                    const uris = await umi.uploader.upload([file])
                    uploadResults[i] = {
                        index: i,
                        fileName: path.basename(filePath),
                        mimeType: mimeType || '',
                        uri: uris[0],
                    }
                    break
                } catch (error) {
                    retryCount++
                    if (retryCount > MAX_RETRIES) {
                        throw new Error(
                            `Upload failed for ${path.basename(filePath)} after ${MAX_RETRIES} retries: ` +
                            `${error instanceof Error ? error.message : String(error)}`
                        )
                    }
                    const backoffDelay = Math.pow(2, retryCount) * 1000
                    console.log(`Upload attempt ${retryCount} failed for ${path.basename(filePath)}, retrying in ${backoffDelay}ms...`)
                    await new Promise(resolve => setTimeout(resolve, backoffDelay))
                }
            }

            onProgress?.(i)
        }
    }

    return uploadResults
}

export default uploadFiles
