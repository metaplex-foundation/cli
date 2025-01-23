import {JsonMetadata} from '@metaplex-foundation/mpl-token-metadata'
import fs from 'fs'

const readJsonMetadataFromFile = async (filePath: string): Promise<JsonMetadata> => {
  // Read the file from the file path
  const file = JSON.parse(fs.readFileSync(filePath, 'utf-8'))

  return file
}

export default readJsonMetadataFromFile
