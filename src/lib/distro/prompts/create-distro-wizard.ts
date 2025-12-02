import { confirm, input, select } from '@inquirer/prompts'
import { isPublicKey } from '@metaplex-foundation/umi'

export interface CreateDistroPromptResult {
  name: string
  mint: string
  totalClaimants: number
  startTime: string
  endTime: string
  merkleRoot: string
  distributionType: 'wallet' | 'legacy-nft'
  allowedDistributor: 'permissionless' | 'recipient'
  subsidizeReceipts: boolean
}

const createDistroPrompt = async (): Promise<CreateDistroPromptResult> => {
  const result: CreateDistroPromptResult = {
    name: '',
    mint: '',
    totalClaimants: 0,
    startTime: '',
    endTime: '',
    merkleRoot: '',
    distributionType: 'wallet',
    allowedDistributor: 'permissionless',
    subsidizeReceipts: false,
  }

  // Get the distribution name
  result.name = await input({
    message: 'Distribution Name?',
    validate: (value) => {
      if (!value) return 'Name is required'
      return true
    },
  })

  // Get the mint address
  result.mint = await input({
    message: 'Mint Address?',
    validate: (value) => {
      if (!value) return 'Mint address is required'
      if (!isPublicKey(value)) return 'Invalid mint address'
      return true
    },
  })

  // Get total claimants
  const totalClaimantsInput = await input({
    message: 'Total number of claimants?',
    validate: (value) => {
      const num = parseInt(value)
      if (isNaN(num) || num <= 0) return 'Must be a positive number'
      return true
    },
  })
  result.totalClaimants = parseInt(totalClaimantsInput)

  // Get start time
  result.startTime = await input({
    message: 'Start time (ISO date string, e.g., 2024-01-01T00:00:00Z)?',
    validate: (value) => {
      if (!value) return 'Start time is required'
      const date = new Date(value)
      if (isNaN(date.getTime())) return 'Invalid date format. Use ISO format (e.g., 2024-01-01T00:00:00Z)'
      return true
    },
  })

  // Get end time
  result.endTime = await input({
    message: 'End time (ISO date string, e.g., 2024-12-31T23:59:59Z)?',
    validate: (value) => {
      if (!value) return 'End time is required'
      const date = new Date(value)
      if (isNaN(date.getTime())) return 'Invalid date format. Use ISO format (e.g., 2024-12-31T23:59:59Z)'
      const startDate = new Date(result.startTime)
      if (date <= startDate) return 'End time must be after start time'
      return true
    },
  })

  // Get merkle root
  result.merkleRoot = await input({
    message: 'Merkle root (32 bytes, base58 encoded)?',
    validate: (value) => {
      if (!value) return 'Merkle root is required'
      // Basic length validation for base58 encoded 32 bytes
      if (value.length < 40 || value.length > 50) {
        return 'Merkle root should be approximately 44 characters (32 bytes base58 encoded)'
      }
      return true
    },
  })

  // Get distribution type
  result.distributionType = await select({
    message: 'Distribution Type?',
    choices: [
      { name: 'Wallet', value: 'wallet' },
      { name: 'Legacy NFT', value: 'legacy-nft' },
    ],
  })

  // Get allowed distributor
  result.allowedDistributor = await select({
    message: 'Who is allowed to distribute tokens?',
    choices: [
      { name: 'Permissionless (anyone can distribute)', value: 'permissionless' },
      { name: 'Recipient only', value: 'recipient' },
    ],
  })

  // Get subsidize receipts option
  result.subsidizeReceipts = await confirm({
    message: 'Subsidize receipt creation costs?',
    default: false,
  })

  return result
}

export default createDistroPrompt