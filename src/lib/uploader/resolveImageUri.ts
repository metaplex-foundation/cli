import ora from 'ora'
import { Umi } from '@metaplex-foundation/umi'
import uploadFile from './uploadFile.js'

const isUrl = (value: string): boolean =>
  value.startsWith('http://') || value.startsWith('https://')

const resolveImageUri = async (umi: Umi, imageInput: string): Promise<string> => {
  if (isUrl(imageInput)) {
    return imageInput
  }

  const spinner = ora('Uploading image...').start()
  const result = await uploadFile(umi, imageInput).catch((err) => {
    spinner.fail(`Failed to upload image: ${err}`)
    throw err
  })
  spinner.succeed(`Image uploaded to ${result.uri}`)
  return result.uri
}

export { isUrl, resolveImageUri }
