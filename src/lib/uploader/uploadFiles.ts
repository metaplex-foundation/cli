import fs from 'node:fs'
import path from 'node:path'
import mime from 'mime'
import {createGenericFile, sol, Umi} from '@metaplex-foundation/umi'
import {createIrysUploader} from '@metaplex-foundation/umi-uploader-irys'

export interface UploadFileResult {
  index?: number
  fileName: string
  uri?: string
  mimeType: string
}

const uploadFiles = async (umi: Umi, filePaths: string[], onProgress?: (progress: number) => void) => {
  const files = filePaths.map((filePath) => {
    const file = fs.readFileSync(filePath)
    const mimeType = mime.getType(filePath)
    return createGenericFile(file, path.basename(filePath), {
      tags: mimeType ? [{name: 'content-type', value: mimeType}] : [],
    })
  })

  const uploader = createIrysUploader(umi)

  const cost = await umi.uploader.getUploadPrice(files)

  // Check balance and fund if necessary with error handling
  try {
    const balance = await uploader.getBalance()

    if (balance < cost) {
      console.log(
        `Insufficient balance. Current: ${balance.basisPoints}, Required: ${cost.basisPoints}. Funding account...`,
      )
      await uploader.fund(sol(Number(cost.basisPoints)), true)
      console.log('Account funded successfully')
    }
  } catch (error) {
    console.error('Failed to check balance or fund account:', error)
    throw new Error(`Upload preparation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  // Upload all files in parallel via umi uploader
  let completedCount = 0
  const uris = await umi.uploader.upload(files, {
    onProgress: () => {
      onProgress?.(completedCount++)
    },
  })

  return uris.map((uri, index) => ({
    index,
    fileName: filePaths[index].split('/').pop() || '',
    mimeType: files[index].tags?.find((tag) => tag.name === 'content-type')?.value || '',
    uri,
  }))
}

export default uploadFiles
