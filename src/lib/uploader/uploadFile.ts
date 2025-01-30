import fs from 'node:fs'
import mime from 'mime'
import {createGenericFile, Umi} from '@metaplex-foundation/umi'

export interface UploadFileRessult {
    uri: string
    mimeType: string
}

const uploadFile = async (umi: Umi, filePath: string): Promise<UploadFileRessult> => {
  const file = fs.readFileSync(filePath)
  const mimeType = mime.getType(filePath)
  const genericFile = createGenericFile(file, 'file', {
    tags: mimeType ? [{name: 'mimeType', value: mimeType}] : [],
  })
  const [uploadResult] = await umi.uploader.upload([genericFile])

  if (!uploadResult) {
    throw new Error('File upload failed')
  }

  return {
    uri: uploadResult,
    mimeType: mimeType || '',
  }
}

export default uploadFile
