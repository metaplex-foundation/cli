import { confirm, input, select } from '@inquirer/prompts'
import { isPublicKey } from '@metaplex-foundation/umi'
import fs from 'node:fs'
import path from 'node:path'
import { Plugin, PluginData } from '../lib/types/pluginData.js'
import pluginConfigurator from './pluginInquirer.js'
import { PluginFilterType, pluginSelector } from './pluginSelector.js'

export type NftType = 'image' | 'video' | 'audio' | 'model'

export interface CreateAssetPromptResult {
  name: string
  description: string
  external_url?: string
  image: string
  animation?: string
  nftType: NftType
  attributes?: Array<{ trait_type: string; value: string }>
  collection?: string
  plugins?: PluginData
}

const VALID_EXTENSIONS: Record<Exclude<NftType, 'image'>, string[]> = {
  video: ['.mp4', '.webm'],
  audio: ['.mp3', '.wav'],
  model: ['.glb', '.gltf'],
}

const createAssetPrompt = async (isCollection = false): Promise<CreateAssetPromptResult> => {
  const result: CreateAssetPromptResult = {
    name: '',
    description: '',
    image: '',
    nftType: 'image',
  }

  // Get the name
  result.name = await input({
    message: isCollection ? 'Collection Name?' : 'Asset Name?',
    validate: (value) => {
      if (!value) return 'Name is required'
      return true
    },
  })

  // Get the description
  result.description = await input({
    message: isCollection ? 'Collection Description?' : 'Asset Description?',
  })

  // Get the external URL
  result.external_url = await input({
    message: isCollection ? 'Collection External URL?' : 'Asset External URL?',
  })

  // Get the NFT type (only for assets, collections are always image type)
  if (!isCollection) {
    result.nftType = await select({
      message: 'Asset Type?',
      choices: [
        { name: 'Image (PNG, JPG, GIF)', value: 'image' },
        { name: 'Video (MP4, WebM)', value: 'video' },
        { name: 'Audio (MP3, WAV)', value: 'audio' },
        { name: '3D Model (GLB, GLTF)', value: 'model' },
      ],
    })
  }

  // Get the image path
  result.image = await input({
    message: isCollection ? 'Collection Image Path?' : (result.nftType === 'image' ? 'Asset Image Path?' : 'Asset Preview Image Path? (This will be used as the preview/thumbnail)'),
    validate: (value) => {
      if (!value) return 'Image path is required'
      if (!fs.existsSync(value)) return 'Image file does not exist'
      const ext = path.extname(value).toLowerCase()
      if (!['.png', '.jpg', '.jpeg', '.gif'].includes(ext)) {
        return 'Image must be a PNG, JPG, or GIF file'
      }
      return true
    },
  })

  // Get the animation path if applicable (only for non-image assets)
  if (!isCollection && result.nftType !== 'image') {
    const message = (() => {
      switch (result.nftType) {
        case 'video': return 'Asset Video Path?'
        case 'audio': return 'Asset Audio Path?'
        case 'model': return 'Asset 3D Model Path?'
        default: return 'Asset Animation Path?'
      }
    })()

    result.animation = await input({
      message,
      validate: (value) => {
        if (!value) return 'Animation path is required for non-image types'
        if (!fs.existsSync(value)) return 'Animation file does not exist'
        const ext = path.extname(value).toLowerCase()
        const validExts = VALID_EXTENSIONS[result.nftType as Exclude<NftType, 'image'>]
        if (!validExts.includes(ext)) {
          return `Animation must be a ${validExts.join(', ')} file for the selected type`
        }
        return true
      },
    })
  }

  // Get attributes
  if (!isCollection) {
    const hasAttributes = await confirm({
      message: 'Does this asset have attributes?',
    })

    if (hasAttributes) {
      result.attributes = []
      let continueAdding = true

      while (continueAdding) {
        const trait_type = await input({
          message: 'Attribute Trait Type?',
          validate: (value) => {
            if (!value.trim()) return 'Trait type cannot be empty'
            return true
          }
        })

        const value = await input({
          message: 'Attribute Value?',
          validate: (value) => {
            if (!value.trim()) return 'Value cannot be empty'
            return true
          }
        })

        result.attributes.push({ trait_type, value })

        continueAdding = await confirm({
          message: 'Add another attribute?',
        })
      }
    }
  }

  // Get collection ID if not creating a collection
  if (!isCollection) {
    const hasCollection = await confirm({
      message: 'Does this asset belong to a collection?',
    })

    if (hasCollection) {
      result.collection = await input({
        message: 'Collection ID?',
        validate: (value) => {
          if (!value) return 'Collection ID is required'
          if (!isPublicKey(value)) return 'Invalid collection ID'
          return true
        },
      })
    }
  }

  // Get plugins
  const wantsPlugins = await confirm({
    message: isCollection ? 'Do you want to add plugins to this collection?' : 'Do you want to add plugins to this asset?',
  })

  if (wantsPlugins) {
    const selectedPlugins = await pluginSelector({ filter: isCollection ? PluginFilterType.Collection : PluginFilterType.Asset })
    if (selectedPlugins) {
      result.plugins = await pluginConfigurator(selectedPlugins as Plugin[])
    }
  }

  return result
}

export default createAssetPrompt 