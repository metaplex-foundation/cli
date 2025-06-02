import { input, confirm } from '@inquirer/prompts'
import fs from 'node:fs'
import path from 'node:path'

interface TokenWizardInput {
  name: string
  symbol: string
  decimals: number
  image?: string
  description: string
  external_url?: string
  mintAmount: number
}

export default async function createTokenPrompt(): Promise<TokenWizardInput> {
  const name = await input({
    message: 'What is the name of your token?',
    validate: (input) => input.length > 0 || 'Name is required',
  })

  const symbol = await input({
    message: 'What is the symbol of your token?',
    validate: (input) => {
      if (!input) return 'Symbol is required'
      if (input.length > 10) return 'Symbol must be 10 characters or less'
      return true
    },
  })

  const description = await input({
    message: 'What is the description of your token?',
    validate: (input) => input.length > 0 || 'Description is required',
  })

  const external_url = await input({
    message: 'What is the external URL for your token? (optional)',
  })

  const hasImage = await confirm({
    message: 'Do you want to add an image to your token?',
    default: false,
  })

  let image: string | undefined
  if (hasImage) {
    image = await input({
      message: 'What is the path to your image file?',
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
  }

  const decimalsStr = await input({
    message: 'How many decimals should your token have?',
    validate: (input) => {
      const num = parseInt(input)
      if (isNaN(num)) return 'Please enter a valid number'
      if (num < 0 || num > 9) return 'Decimals must be between 0 and 9'
      return true
    },
  })
  const decimals = parseInt(decimalsStr)

  const mintAmountStr = await input({
    message: `How many tokens do you want to mint? (Enter the exact amount including decimals. Example: For 500 tokens with ${decimals} decimals, enter 500_${'0'.repeat(decimals)})`,
    validate: (input) => {
      const num = parseInt(input)
      if (isNaN(num) || num <= 0) return 'Please enter a valid number greater than 0'
      return true
    },
  })
  const mintAmount = parseInt(mintAmountStr)

  return {
    name,
    symbol,
    decimals,
    image,
    description,
    external_url: external_url || undefined,
    mintAmount,
  }
}
