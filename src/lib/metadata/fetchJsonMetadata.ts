import {fetchJsonMetadata, JsonMetadata} from '@metaplex-foundation/mpl-token-metadata'
import {Umi} from '@metaplex-foundation/umi'
import ora from 'ora'

const fetchUriMetadata = async (umi: Umi, uri: string): Promise<JsonMetadata> => {
  const spinner = ora(`Fetching metadata from URI: ${uri}`).start()
  try {
    const metadata = await fetchJsonMetadata(umi, uri)

    //assert metadata is valid
    if (!metadata.name) {
      throw new Error('Metadata missing required field: name')
    }

    spinner.succeed('Metadata fetched successfully')
    return metadata
  } catch (error) {
    spinner.fail('Failed to fetch metadata')
    throw error
  }
}

export default fetchUriMetadata
