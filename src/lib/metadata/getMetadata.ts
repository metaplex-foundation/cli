import {AssetV1} from '@metaplex-foundation/mpl-core'
import {JsonMetadata} from '@metaplex-foundation/mpl-token-metadata'
import fs from 'fs'
import fetchUriMetadata from './fetchJsonMetadata.js'
import {Umi} from '@metaplex-foundation/umi'

interface MetadataSource {
  asset?: AssetV1
  uri?: string
  path?: string
}

const getMetadata = async (umi: Umi, {asset, uri, path}: MetadataSource): Promise<JsonMetadata> => {
  if (uri) {
    // Fetch metadata from URI
    return await fetchUriMetadata(umi, uri)
  }

  if (path) {
    // Use JSON file metadata
    return JSON.parse(fs.readFileSync(path, 'utf-8'))
  }

  if (asset) {
    return await fetchUriMetadata(umi, asset.uri)
  }

  throw new Error('No metadata source provided')
}

export default getMetadata
