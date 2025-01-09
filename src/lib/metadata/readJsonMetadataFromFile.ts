import {JsonMetadata} from '@metaplex-foundation/mpl-token-metadata'
import fs from 'fs'

const readJsonMetadataFromFile = async (filePath: string): Promise<JsonMetadata> => {
  // Read the file from the file path
  const file = JSON.parse(fs.readFileSync(filePath, 'utf-8')).catch(() => {
    throw invalidJsonMetadata
  }) as JsonMetadata

  // validate the file
  return file
}

export default readJsonMetadataFromFile

const invalidJsonMetadata = new Error('Json Metadata file is invalid')
