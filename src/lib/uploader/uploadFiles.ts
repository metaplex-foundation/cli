import fs from 'node:fs'
import mime from 'mime'
import { createGenericFile, sol, Umi } from '@metaplex-foundation/umi'
import { createIrysUploader } from '@metaplex-foundation/umi-uploader-irys'

export interface UploadFileRessult {
    index?: number
    fileName: string
    uri?: string
    mimeType: string
}

const uploadFiles = async (umi: Umi, filePaths: string[], onProgress?: (progress: number) => void) => {

    const files = filePaths.map(filePath => {
        const file = fs.readFileSync(filePath)
        const mimeType = mime.getType(filePath)
        return createGenericFile(file, 'file', {
            tags: mimeType ? [{ name: 'content-type', value: mimeType }] : [],
        })
    })

    const uploader = createIrysUploader(umi)

    const cost = await umi.uploader.getUploadPrice(files)

    const balance = await uploader.getBalance()

    if (balance < cost) {
        await uploader.fund(sol(Number(cost.basisPoints)), true)
    }

    const uploadResults: UploadFileRessult[] = []

    // Upload each file individually with retry logic (sequentially to maintain order)
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
                    result.uri = undefined
                    uploadResults.push(result)
                    onProgress?.(index)
                    break // Success, exit retry loop
                }
                // Wait a bit before retrying (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, uploadErrorCount) * 1000))
            }
        }
    }

    return uploadResults
}

export default uploadFiles
