import fs from 'node:fs'
import mime from 'mime'
import untildify from 'untildify'
import { createGenericFile, Umi } from '@metaplex-foundation/umi'

export interface UploadFileRessult {
  uri: string
  mimeType: string
}

const uploadFile = async (umi: Umi, filePath: string): Promise<UploadFileRessult> => {
  // Expand tilde in file path if present
  const expandedPath = untildify(filePath)

  try {
    const file = fs.readFileSync(expandedPath)
    const mimeType = mime.getType(expandedPath)
    const genericFile = createGenericFile(file, 'file', {
      tags: mimeType ? [{ name: 'content-type', value: mimeType }] : [],
    })
    const [uploadResult] = await umi.uploader.upload([genericFile])

    if (!uploadResult) {
      throw new Error('File upload failed')
    }

    return {
      uri: uploadResult,
      mimeType: mimeType || '',
    }

  } catch (error) {
    throw new Error(`File upload failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export default uploadFile
