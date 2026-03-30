interface ImageFileEntry {
  uri: string
  type: string
}

interface JsonMetadata {
  image?: string
  properties?: {
    files?: ImageFileEntry[]
    [key: string]: unknown
  }
  [key: string]: unknown
}

const prepareJsonMetadata = (jsonFile: JsonMetadata, imageEntry: ImageFileEntry): JsonMetadata => {
  jsonFile.image = imageEntry.uri

  if (!jsonFile.properties) {
    jsonFile.properties = { files: [imageEntry] }
  } else if (!jsonFile.properties.files) {
    jsonFile.properties.files = [imageEntry]
  } else {
    jsonFile.properties.files[0] = imageEntry
  }

  return jsonFile
}

export default prepareJsonMetadata
export type { JsonMetadata, ImageFileEntry }
