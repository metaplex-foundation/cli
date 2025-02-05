import { Umi } from '@metaplex-foundation/umi'

const uploadJson = async (umi: Umi, json: object): Promise<string> => {
  const [uploadResult] = await umi.uploader.uploadJson(json)

  if (!uploadResult) {
    throw new Error('JSON upload failed')
  }

  return uploadResult
}

export default uploadJson
