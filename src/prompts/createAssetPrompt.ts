import { select, input, confirm } from '@inquirer/prompts'
import fs from 'node:fs'
import path from 'node:path'

export type NftType = 'image' | 'video' | 'audio' | 'model'

interface AssetWizardInput {
  name: string
  description?: string
  external_url?: string
  attributes?: Array<{ trait_type: string; value: string }>
  image: string
  animation?: string
  nftType: NftType
  addAttributes?: boolean
  collection?: string
}

const VALID_EXTENSIONS: Record<Exclude<NftType, 'image'>, string[]> = {
  video: ['.mp4', '.webm'],
  audio: ['.mp3', '.wav'],
  model: ['.glb', '.gltf'],
}

export default async function createAssetPrompt(): Promise<AssetWizardInput> {
  const nftType = await select<NftType>({
    message: 'What type of NFT are you creating?',
    choices: [
      { name: 'Image (PNG, JPG, GIF)', value: 'image' },
      { name: 'Video (MP4, WebM)', value: 'video' },
      { name: 'Audio (MP3, WAV)', value: 'audio' },
      { name: '3D Model (GLB, GLTF)', value: 'model' },
    ],
  })

  const name = await input({
    message: 'What is the name of your asset?',
    validate: (input) => input.length > 0 || 'Name is required',
  })

  const description = await input({
    message: 'What is the description of your asset? (optional)',
  })

  const external_url = await input({
    message: 'What is the external URL for your asset? (optional)',
  })

  const addToCollection = await confirm({
    message: 'Do you want to add this asset to a collection?',
    default: false,
  })

  let collection: string | undefined
  if (addToCollection) {
    collection = await input({
      message: 'Enter the collection ID:',
      validate: (input) => input.length > 0 || 'Collection ID is required',
    })
  }

  const addAttributes = await confirm({
    message: 'Do you want to add attributes to your asset?',
    default: false,
  })

  let attributes: Array<{ trait_type: string; value: string }> | undefined
  if (addAttributes) {
    const attributesInput = await input({
      message: 'Enter attributes in format "trait_type:value" (comma-separated for multiple)',
      validate: (input) => {
        if (!input) return 'At least one attribute is required when adding attributes'
        const attrs = input.split(',').map(attr => attr.trim())
        for (const attr of attrs) {
          if (!attr.includes(':')) return 'Each attribute must be in format "trait_type:value"'
        }
        return true
      },
    })

    attributes = attributesInput.split(',').map(attr => {
      const [trait_type, value] = attr.trim().split(':')
      return { trait_type, value }
    })
  }

  const image = await input({
    message: nftType === 'image' 
      ? 'What is the path to your image file?'
      : 'What is the path to your placeholder image? (This will be used as the preview/thumbnail)',
    validate: (input) => {
      if (!input) return 'Image path is required'
      if (!fs.existsSync(input)) return 'Image file does not exist'
      const ext = path.extname(input).toLowerCase()
      if (!['.png', '.jpg', '.jpeg', '.gif'].includes(ext)) {
        return 'Image must be a PNG, JPG, or GIF file'
      }
      return true
    },
  })

  let animation: string | undefined
  if (nftType !== 'image') {
    const message = (() => {
      switch (nftType) {
        case 'video': return 'What is the path to your video file?'
        case 'audio': return 'What is the path to your audio file?'
        case 'model': return 'What is the path to your 3D Model file?'
        default: return 'What is the path to your animation file?'
      }
    })()

    animation = await input({
      message,
      validate: (input) => {
        if (!input) return true // Optional
        if (!fs.existsSync(input)) return 'Animation file does not exist'
        const ext = path.extname(input).toLowerCase()
        const validExts = VALID_EXTENSIONS[nftType]
        if (!validExts.includes(ext)) {
          return `Animation must be a ${validExts.join(', ')} file for the selected NFT type.`
        }
        return true
      },
    })
  }

  return {
    nftType,
    name,
    description: description || undefined,
    external_url: external_url || undefined,
    attributes,
    image,
    animation,
    addAttributes,
    collection,
  }
} 