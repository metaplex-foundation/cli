import { confirm, input, select } from '@inquirer/prompts'
import { isPublicKey } from '@metaplex-foundation/umi'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export type NftType = 'image' | 'video' | 'audio' | 'model'

export interface CreateTokenMetadataPromptResult {
  name: string
  description: string
  external_url?: string
  image: string
  animation?: string
  nftType: NftType
  attributes?: Array<{ trait_type: string; value: string }>
  collection?: string
  enforceRoyalties: boolean // This determines if pnft = true
  sellerFeePercentage?: number // Store as percentage for percentAmount()
}

const VALID_EXTENSIONS: Record<Exclude<NftType, 'image'>, string[]> = {
  video: ['.mp4', '.webm'],
  audio: ['.mp3', '.wav'],
  model: ['.glb', '.gltf'],
}

const createTokenMetadataPrompt = async (): Promise<CreateTokenMetadataPromptResult> => {
  const result: CreateTokenMetadataPromptResult = {
    name: '',
    description: '',
    image: '',
    nftType: 'image',
    enforceRoyalties: true, // Default to true for Token Metadata
  }

  // Get the name
  result.name = await input({
    message: 'NFT Name?',
    validate: (value) => {
      if (!value) return 'Name is required'
      return true
    },
  })

  // Get the description
  result.description = await input({
    message: 'NFT Description?',
  })

  // Get the external URL
  result.external_url = await input({
    message: 'NFT External URL (optional)?',
  })

  // Get the NFT type
  result.nftType = await select({
    message: 'NFT Type?',
    choices: [
      { name: 'Image (PNG, JPG, GIF)', value: 'image' },
      { name: 'Video (MP4, WebM)', value: 'video' },
      { name: 'Audio (MP3, WAV)', value: 'audio' },
      { name: '3D Model (GLB, GLTF)', value: 'model' },
    ],
  })

  // Get the image path
  result.image = await input({
    message: result.nftType === 'image' ? 'NFT Image Path?' : 'NFT Preview Image Path? (This will be used as the preview/thumbnail)',
    validate: (value) => {
      if (!value) return 'Image path is required'
      
      // Expand tilde to home directory
      let expandedPath = value
      if (value.startsWith('~/') || value === '~') {
        expandedPath = path.join(os.homedir(), value.slice(1))
      }
      
      if (!fs.existsSync(expandedPath)) return 'Image file does not exist'
      
      // Check if path points to a regular file (not a directory)
      try {
        const stats = fs.statSync(expandedPath)
        if (!stats.isFile()) {
          return 'Path must point to a regular file, not a directory'
        }
      } catch (error) {
        return 'Unable to access file'
      }
      
      const ext = path.extname(expandedPath).toLowerCase()
      if (!['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext)) {
        return 'Image must be a PNG, JPG/JPEG, GIF, or WEBP file'
      }
      return true
    },
  })
  
  // Expand tilde in the stored result as well
  if (result.image.startsWith('~/') || result.image === '~') {
    result.image = path.join(os.homedir(), result.image.slice(1))
  }

  // Get the animation path if applicable (only for non-image assets)
  if (result.nftType !== 'image') {
    const message = (() => {
      switch (result.nftType) {
        case 'video': return 'NFT Video Path?'
        case 'audio': return 'NFT Audio Path?'
        case 'model': return 'NFT 3D Model Path?'
        default: return 'NFT Animation Path?'
      }
    })()

    result.animation = await input({
      message,
      validate: (value) => {
        if (!value) return 'Animation path is required for non-image types'
        
        // Expand tilde to home directory
        let expandedPath = value
        if (value.startsWith('~/') || value === '~') {
          expandedPath = path.join(os.homedir(), value.slice(1))
        }
        
        if (!fs.existsSync(expandedPath)) return 'Animation file does not exist'
        
        // Check if path points to a regular file (not a directory)
        try {
          const stats = fs.statSync(expandedPath)
          if (!stats.isFile()) {
            return 'Path must point to a regular file, not a directory'
          }
        } catch (error) {
          return 'Unable to access file'
        }
        
        const ext = path.extname(expandedPath).toLowerCase()
        const validExts = VALID_EXTENSIONS[result.nftType as Exclude<NftType, 'image'>]
        if (!validExts.includes(ext)) {
          return `Animation must be a ${validExts.join(', ')} file for the selected type`
        }
        return true
      },
    })
    
    // Expand tilde in the stored result as well
    if (result.animation && (result.animation.startsWith('~/') || result.animation === '~')) {
      result.animation = path.join(os.homedir(), result.animation.slice(1))
    }
  }

  // Get attributes
  const hasAttributes = await confirm({
    message: 'Does this NFT have attributes?',
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

  // Get collection ID
  const hasCollection = await confirm({
    message: 'Does this NFT belong to a collection?',
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

  // Ask for royalty percentage (applies to both regular NFTs and pNFTs)
  const royaltyPercentage = await input({
    message: 'Royalty percentage for secondary sales (0-100)?',
    default: '5',
    validate: (value) => {
      const num = parseFloat(value)
      if (isNaN(num)) return 'Please enter a valid number'
      if (num < 0 || num > 100) return 'Royalty percentage must be between 0 and 100'
      return true
    }
  })
  // Store as percentage for percentAmount() function
  result.sellerFeePercentage = parseFloat(royaltyPercentage)

  // Ask about royalty enforcement (this determines pNFT vs regular NFT)
  result.enforceRoyalties = await confirm({
    message: 'Do you want to enforce royalties on secondary sales? (Creates a Programmable NFT that can block non-compliant transfers)',
    default: true,
  })

  return result
}

export default createTokenMetadataPrompt