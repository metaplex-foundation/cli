import fs from 'node:fs'
import path from 'node:path'
import mime from 'mime'
import { createGenericFile, sol, Umi } from '@metaplex-foundation/umi'
import { createIrysUploader } from '@metaplex-foundation/umi-uploader-irys'

export interface UploadFileResult {
    index?: number
    fileName: string
    uri?: string
    mimeType: string
}

const uploadFiles = async (umi: Umi, filePaths: string[], onProgress?: (progress: number) => void) => {

    const files = filePaths.map(filePath => {
        const file = fs.readFileSync(filePath)
        const mimeType = mime.getType(filePath)
        return createGenericFile(file, path.basename(filePath), {
            tags: mimeType ? [{ name: 'content-type', value: mimeType }] : [],
        })
    })

    const uploader = createIrysUploader(umi)

    const cost = await umi.uploader.getUploadPrice(files)

    // Check balance and fund if necessary with error handling
    try {
        const balance = await uploader.getBalance()

        if (balance < cost) {
            console.log(`Insufficient balance. Current: ${balance.basisPoints}, Required: ${cost.basisPoints}. Funding account...`)
            await uploader.fund(sol(Number(cost.basisPoints)), true)
            console.log('Account funded successfully')
        }
    } catch (error) {
        console.error('Failed to check balance or fund account:', error)
        throw new Error(`Upload preparation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    const uploadResults: UploadFileResult[] = []

    // Upload each file individually with retry logic (sequentially to maintain order)
    // Uses exponential backoff: 2^retry * 1000ms delay between retries
    for (let index = 0; index < files.length; index++) {
        const file = files[index]
        let uploadErrorCount = 0
        const maxRetries = 3

        const result = {
            index,
            fileName: filePaths[index].split('/').pop() || '',
            mimeType: files[index].tags?.find(tag => tag.name === 'content-type')?.value || '',
            uri: undefined as string | undefined,
        }

        while (uploadErrorCount <= maxRetries) {
            try {
                const uris = await umi.uploader.upload([file])

                result.uri = uris[0]

                uploadResults.push(result)
                onProgress?.(index)
                break // Success, exit retry loop

            } catch (error) {
                uploadErrorCount++
                if (uploadErrorCount > maxRetries) {
                    console.warn(`Upload failed for ${result.fileName} after ${maxRetries} retries:`, error)
                    result.uri = undefined
                    uploadResults.push(result)
                    onProgress?.(index)
                    break // Retry limit exceeded, marking upload as failed
                }
                // Exponential backoff: wait 2^retry seconds before next attempt
                const backoffDelay = Math.pow(2, uploadErrorCount) * 1000
                console.log(`Upload attempt ${uploadErrorCount} failed for ${result.fileName}, retrying in ${backoffDelay}ms...`)
                await new Promise(resolve => setTimeout(resolve, backoffDelay))
            }
        }
    }

    return uploadResults
}

export default uploadFiles
