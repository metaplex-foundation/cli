import { input, select, confirm } from '@inquirer/prompts'
import { isPublicKey } from '@metaplex-foundation/umi'

import type { AddLaunchPoolParams, AddPresaleParams, AddUnlockedParams } from './operations.js'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface GenesisCreateResult {
  name: string
  symbol: string
  totalSupply: string
  decimals: number
  uri: string
  fundingMode: 'new-mint' | 'transfer'
  baseMint?: string
  quoteMint?: string
}

export type LaunchPoolBucketResult = AddLaunchPoolParams
export type PresaleBucketResult = AddPresaleParams
export type UnlockedBucketResult = AddUnlockedParams

export type BucketChoice = 'launch-pool' | 'presale' | 'unlocked' | 'done'

export interface LaunchWizardResult {
  launchType: 'launchpool' | 'bondingCurve'
  name: string
  symbol: string
  image: string
  description?: string
  website?: string
  twitter?: string
  telegram?: string
  quoteMint: string
  // launchpool-specific
  depositStartTime?: string
  tokenAllocation?: number
  raiseGoal?: number
  raydiumLiquidityBps?: number
  fundsRecipient?: string
  // bonding-curve-specific
  creatorFeeWallet?: string
  firstBuyAmount?: number
  // agent support
  agentMint?: string
  agentSetToken?: boolean
}

export interface RegisterLaunchResult {
  image: string
  description?: string
  website?: string
  twitter?: string
  telegram?: string
  quoteMint: string
  depositStartTime: string
  tokenAllocation: number
  raiseGoal: number
  raydiumLiquidityBps: number
  fundsRecipient: string
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const MIN_RAISE_GOAL: Record<string, number> = {
  SOL: 250,
  USDC: 25000,
}

const KNOWN_QUOTE_MINTS: Record<string, string> = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
}

/* ------------------------------------------------------------------ */
/*  Validators (return true | error string for @inquirer/prompts)       */
/* ------------------------------------------------------------------ */

function abortOrTrue(v: string): true | void {
  if (v.trim().toLowerCase() === 'q') {
    console.log('Aborting wizard.')
    // eslint-disable-next-line no-process-exit, unicorn/no-process-exit
    process.exit(0)
  }
}

function validateTimestamp(v: string, opts?: { requireFuture?: boolean; allowEmpty?: boolean }): string | true {
  abortOrTrue(v)
  const trimmed = v.trim()
  if (!trimmed) return opts?.allowEmpty ? true : 'Required'

  if (/^\d{4}-\d{2}/.test(trimmed)) {
    const ms = Date.parse(trimmed)
    if (Number.isNaN(ms)) return 'Invalid date. Use ISO format (e.g. 2025-06-01T00:00:00Z) or a unix timestamp.'
    if (opts?.requireFuture && ms <= Date.now()) return 'Must be in the future'
    return true
  }
  if (/^\d+$/.test(trimmed)) {
    const n = BigInt(trimmed)
    if (n > 10_000_000_000n) return 'Value looks like milliseconds. Please provide a unix timestamp in seconds.'
    if (opts?.requireFuture && n <= BigInt(Math.floor(Date.now() / 1000))) return 'Must be in the future'
    return true
  }
  return 'Invalid. Use ISO format (e.g. 2025-06-01T00:00:00Z) or a unix timestamp.'
}

function validateRequired(v: string): string | true {
  abortOrTrue(v)
  return v.trim() ? true : 'Required'
}

function validatePositiveInt(v: string): string | true {
  abortOrTrue(v)
  if (!v.trim()) return 'Required'
  if (!/^\d+$/.test(v) || BigInt(v) <= 0n) return 'Must be a positive integer'
  return true
}

function validateNonNegativeInt(v: string): string | true {
  abortOrTrue(v)
  if (!v.trim()) return 'Required'
  if (!/^\d+$/.test(v)) return 'Must be a non-negative integer'
  return true
}

function validateOptionalNonNegativeInt(v: string): string | true {
  abortOrTrue(v)
  if (!v.trim()) return true
  if (!/^\d+$/.test(v)) return 'Must be a non-negative integer'
  return true
}

function validatePublicKey(v: string): string | true {
  abortOrTrue(v)
  if (!v.trim()) return 'Required'
  if (!isPublicKey(v.trim())) return 'Invalid Solana public key'
  return true
}

function validateOptionalPublicKey(v: string): string | true {
  abortOrTrue(v)
  if (!v.trim()) return true
  if (!isPublicKey(v.trim())) return 'Invalid Solana public key'
  return true
}

async function promptPublicKeyInput(message: string): Promise<string> {
  const value = await input({ message, validate: validatePublicKey })
  return value.trim()
}

function validateUrlField(v: string, type: 'website' | 'twitter' | 'telegram'): string | true {
  abortOrTrue(v)
  if (!v.trim()) return true // optional
  if (type === 'website' && !/^https?:\/\/.+/.test(v.trim())) return 'Must start with http:// or https://'
  if (type === 'twitter' && !/^https?:\/\/(x\.com|twitter\.com)\/.+/.test(v.trim())) return 'Must be a valid x.com or twitter.com link'
  if (type === 'telegram' && !/^https?:\/\/(t\.me|telegram\.me)\/.+/.test(v.trim())) return 'Must be a valid t.me or telegram.me link'
  return true
}

/* ------------------------------------------------------------------ */
/*  Conversion helpers                                                 */
/* ------------------------------------------------------------------ */

export function toUnixTimestamp(v: string): string {
  if (/^\d+$/.test(v)) return v
  const ms = Date.parse(v)
  if (Number.isNaN(ms)) throw new Error(`Invalid date: "${v}"`)
  return String(Math.floor(ms / 1000))
}

/** Normalize user input to an ISO string (for SDK API calls that expect Date | string). */
export function toISOTimestamp(v: string): string {
  if (/^\d+$/.test(v)) return new Date(Number(v) * 1000).toISOString()
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date: "${v}"`)
  return d.toISOString()
}

/* ------------------------------------------------------------------ */
/*  Shared prompt helpers (API wizard)                                 */
/* ------------------------------------------------------------------ */

export async function promptTokenMetadata(): Promise<{ name: string; symbol: string; image: string; description?: string }> {
  const name = await input({
    message: 'Token name (1-32 chars):',
    validate: (v) => { abortOrTrue(v); if (!v.trim()) return 'Required'; if (v.length > 32) return 'Max 32 characters'; return true },
  })

  const symbol = await input({
    message: 'Token symbol (1-10 chars):',
    validate: (v) => { abortOrTrue(v); if (!v.trim()) return 'Required'; if (v.length > 10) return 'Max 10 characters'; return true },
  })

  const image = await input({
    message: 'Token image (https:// URL or local file path):',
    validate: (v) => {
      abortOrTrue(v)
      if (v.startsWith('https://')) return true
      if (v.startsWith('http://')) return 'Remote URLs must use https://'
      if (v.trim().length > 0) return true
      return 'Must be a valid https URL or a local file path'
    },
  })

  const description = await input({
    message: 'Token description (max 250 chars, press Enter to skip):',
    validate: (v) => { abortOrTrue(v); if (v.length > 250) return 'Max 250 characters'; return true },
  })

  return {
    name,
    symbol,
    image,
    ...(description && { description }),
  }
}

export async function promptSocialLinks(): Promise<{ website?: string; twitter?: string; telegram?: string }> {
  const website = await input({
    message: 'Website URL (press Enter to skip):',
    validate: (v) => validateUrlField(v, 'website'),
  })

  const twitter = await input({
    message: 'Twitter/X URL (press Enter to skip):',
    validate: (v) => validateUrlField(v, 'twitter'),
  })

  const telegram = await input({
    message: 'Telegram URL (press Enter to skip):',
    validate: (v) => validateUrlField(v, 'telegram'),
  })

  return {
    ...(website.trim() && { website: website.trim() }),
    ...(twitter.trim() && { twitter: twitter.trim() }),
    ...(telegram.trim() && { telegram: telegram.trim() }),
  }
}

export async function promptQuoteMint(): Promise<string> {
  const choice = await select({
    message: 'Quote token (payment token):',
    choices: [
      { name: 'SOL (Wrapped SOL)', value: 'SOL' },
      { name: 'USDC', value: 'USDC' },
      { name: 'Custom mint address', value: 'custom' },
    ],
  })

  if (choice === 'custom') {
    return promptPublicKeyInput('Enter custom quote mint address:')
  }

  return choice
}

export async function promptProjectConfig(quoteMint: string): Promise<{
  tokenAllocation: number
  raiseGoal: number
  raydiumLiquidityBps: number
  fundsRecipient: string
}> {
  const allocationStr = await input({
    message: 'Launch pool token allocation (portion of 1B total supply, e.g. 500000000):',
    validate: (v) => {
      const result = validatePositiveInt(v)
      if (result !== true) return result
      if (BigInt(v) > 1_000_000_000n) return 'Must not exceed 1,000,000,000'
      return true
    },
  })
  const tokenAllocation = Number(allocationStr)

  const quoteName = Object.entries(KNOWN_QUOTE_MINTS).find(([, v]) => v === quoteMint)?.[0] ?? quoteMint
  const minRaise = MIN_RAISE_GOAL[quoteName] ?? MIN_RAISE_GOAL.SOL
  const raiseGoalStr = await input({
    message: `Raise goal in whole ${quoteName} units (minimum ${minRaise}):`,
    validate: (v) => {
      abortOrTrue(v)
      if (!v.trim()) return 'Required'
      const n = Number(v)
      if (isNaN(n) || !Number.isInteger(n) || n < minRaise) return `Must be a whole number >= ${minRaise}`
      return true
    },
  })
  const raiseGoal = Number(raiseGoalStr)

  const raydiumPctStr = await input({
    message: 'Raydium liquidity percentage (20-100):',
    default: '50',
    validate: (v) => {
      abortOrTrue(v)
      const n = Number(v)
      if (isNaN(n) || !Number.isInteger(n) || n < 20 || n > 100) return 'Must be a whole number between 20 and 100'
      return true
    },
  })
  const raydiumLiquidityBps = Number(raydiumPctStr) * 100

  const fundsRecipient = await promptPublicKeyInput('Funds recipient wallet address:')

  return { tokenAllocation, raiseGoal, raydiumLiquidityBps, fundsRecipient }
}

/* ------------------------------------------------------------------ */
/*  Agent prompts                                                      */
/* ------------------------------------------------------------------ */

export async function promptAgentConfig(): Promise<{ agentMint?: string; agentSetToken?: boolean }> {
  const useAgent = await confirm({
    message: 'Launch as an agent? (wraps transactions for on-chain agent execution)',
    default: false,
  })

  if (!useAgent) return {}

  const agentMint = await promptPublicKeyInput('Agent NFT mint address:')

  const agentSetToken = await confirm({
    message: 'Set the launched token on the agent NFT?',
    default: true,
  })

  return { agentMint, agentSetToken }
}

/* ------------------------------------------------------------------ */
/*  Bonding curve prompts                                              */
/* ------------------------------------------------------------------ */

export async function promptBondingCurveConfig(): Promise<{
  creatorFeeWallet?: string
  firstBuyAmount?: number
}> {
  const customFeeWallet = await confirm({
    message: 'Set a custom creator fee wallet? (defaults to launching wallet)',
    default: false,
  })

  let creatorFeeWallet: string | undefined
  if (customFeeWallet) {
    creatorFeeWallet = await promptPublicKeyInput('Creator fee wallet address:')
  }

  const doFirstBuy = await confirm({
    message: 'Make a mandatory first buy on the bonding curve?',
    default: false,
  })

  let firstBuyAmount: number | undefined
  if (doFirstBuy) {
    const amountStr = await input({
      message: 'First buy amount in SOL (e.g. 0.1):',
      validate: (v) => {
        abortOrTrue(v)
        if (!v.trim()) return 'Required'
        const n = Number(v)
        if (isNaN(n) || !Number.isFinite(n) || n <= 0) return 'Must be a finite positive number'
        return true
      },
    })
    firstBuyAmount = Number(amountStr)
  }

  return {
    ...(creatorFeeWallet && { creatorFeeWallet }),
    ...(firstBuyAmount !== undefined && { firstBuyAmount }),
  }
}

/* ------------------------------------------------------------------ */
/*  Manual wizard prompts                                              */
/* ------------------------------------------------------------------ */

export async function promptGenesisCreate(): Promise<GenesisCreateResult> {
  const name = await input({ message: 'Token name:', validate: validateRequired })
  const symbol = await input({ message: 'Token symbol:', validate: validateRequired })

  const totalSupplyStr = await input({
    message: 'Total supply (in base units):',
    default: '1000000000',
    validate: validateNonNegativeInt,
  })

  const decimalsStr = await input({
    message: 'Decimals:',
    default: '9',
    validate: (v) => {
      abortOrTrue(v)
      const n = Number(v)
      if (isNaN(n) || !Number.isInteger(n) || n < 0 || n > 18) return 'Must be an integer 0-18'
      return true
    },
  })
  const decimals = Number(decimalsStr)

  const uri = await input({ message: 'Token metadata URI (press Enter to skip):' })
  abortOrTrue(uri)

  const fundingMode = await select({
    message: 'Funding mode:',
    choices: [
      { name: 'New Mint — create a new token mint', value: 'new-mint' as const },
      { name: 'Transfer — use an existing mint', value: 'transfer' as const },
    ],
  })

  let baseMint: string | undefined
  if (fundingMode === 'transfer') {
    baseMint = await promptPublicKeyInput('Existing base mint address:')
  }

  const useCustomQuote = await confirm({ message: 'Use a custom quote token? (default: SOL)', default: false })
  let quoteMint: string | undefined
  if (useCustomQuote) {
    quoteMint = await promptPublicKeyInput('Quote mint address:')
  }

  return {
    name,
    symbol,
    totalSupply: totalSupplyStr,
    decimals,
    uri: uri || '',
    fundingMode,
    ...(baseMint && { baseMint }),
    ...(quoteMint && { quoteMint }),
  }
}

export async function promptLaunchPoolBucket(nextIndex: number): Promise<LaunchPoolBucketResult> {
  const allocationStr = await input({ message: 'Token allocation for this launch pool (in base units):', validate: validatePositiveInt })
  const bucketIndexStr = await input({ message: 'Bucket index:', default: String(nextIndex), validate: validateNonNegativeInt })
  const bucketIndex = Number(bucketIndexStr)

  const depositStartStr = await input({ message: 'Deposit start (ISO date or unix timestamp):', validate: (v) => validateTimestamp(v) })
  const depositEndStr = await input({ message: 'Deposit end (ISO date or unix timestamp):', validate: (v) => validateTimestamp(v) })
  const claimStartStr = await input({ message: 'Claim start (ISO date or unix timestamp):', validate: (v) => validateTimestamp(v) })
  const claimEndStr = await input({ message: 'Claim end (ISO date or unix timestamp, press Enter for far future):', validate: (v) => validateTimestamp(v, { allowEmpty: true }) })

  // Validate chronology
  const depStartTs = BigInt(toUnixTimestamp(depositStartStr))
  const depEndTs = BigInt(toUnixTimestamp(depositEndStr))
  const clmStartTs = BigInt(toUnixTimestamp(claimStartStr))
  if (depEndTs <= depStartTs) {
    throw new Error('depositEnd must be after depositStart')
  }
  if (clmStartTs < depEndTs) {
    throw new Error('claimStart must be at or after depositEnd')
  }

  // Optional extensions
  const addExtensions = await confirm({ message: 'Add optional extensions (minimum deposit, deposit limit, quote threshold)?', default: false })

  let minimumDeposit: string | undefined
  let depositLimit: string | undefined
  let minimumQuoteTokenThreshold: string | undefined

  if (addExtensions) {
    const minDep = await input({ message: 'Minimum deposit amount (press Enter to skip):', validate: validateOptionalNonNegativeInt })
    if (minDep.trim()) minimumDeposit = minDep.trim()

    const depLim = await input({ message: 'Maximum deposit limit per user (press Enter to skip):', validate: validateOptionalNonNegativeInt })
    if (depLim.trim()) depositLimit = depLim.trim()

    const minThresh = await input({ message: 'Minimum quote token threshold (press Enter to skip):', validate: validateOptionalNonNegativeInt })
    if (minThresh.trim()) minimumQuoteTokenThreshold = minThresh.trim()
  }

  return {
    allocation: allocationStr,
    bucketIndex,
    depositStart: toUnixTimestamp(depositStartStr),
    depositEnd: toUnixTimestamp(depositEndStr),
    claimStart: toUnixTimestamp(claimStartStr),
    claimEnd: claimEndStr.trim() ? toUnixTimestamp(claimEndStr) : '4102444800',
    ...(minimumDeposit && { minimumDeposit }),
    ...(depositLimit && { depositLimit }),
    ...(minimumQuoteTokenThreshold && { minimumQuoteTokenThreshold }),
  }
}

export async function promptPresaleBucket(nextIndex: number): Promise<PresaleBucketResult> {
  const allocationStr = await input({ message: 'Token allocation for this presale (in base units):', validate: validatePositiveInt })
  const quoteCapStr = await input({ message: 'Quote token cap (total quote tokens accepted):', validate: validatePositiveInt })
  const bucketIndexStr = await input({ message: 'Bucket index:', default: String(nextIndex), validate: validateNonNegativeInt })
  const bucketIndex = Number(bucketIndexStr)

  const depositStartStr = await input({ message: 'Deposit start (ISO date or unix timestamp):', validate: (v) => validateTimestamp(v) })
  const depositEndStr = await input({ message: 'Deposit end (ISO date or unix timestamp):', validate: (v) => validateTimestamp(v) })
  const claimStartStr = await input({ message: 'Claim start (ISO date or unix timestamp):', validate: (v) => validateTimestamp(v) })
  const claimEndStr = await input({ message: 'Claim end (ISO date or unix timestamp, press Enter for far future):', validate: (v) => validateTimestamp(v, { allowEmpty: true }) })

  // Validate chronology
  const depStartTs = BigInt(toUnixTimestamp(depositStartStr))
  const depEndTs = BigInt(toUnixTimestamp(depositEndStr))
  const clmStartTs = BigInt(toUnixTimestamp(claimStartStr))
  if (depEndTs <= depStartTs) {
    throw new Error('depositEnd must be after depositStart')
  }
  if (clmStartTs < depEndTs) {
    throw new Error('claimStart must be at or after depositEnd')
  }

  // Optional deposit limits
  const addLimits = await confirm({ message: 'Add deposit limits?', default: false })
  let minimumDeposit: string | undefined
  let depositLimit: string | undefined

  if (addLimits) {
    const minDep = await input({ message: 'Minimum deposit amount (press Enter to skip):', validate: validateOptionalNonNegativeInt })
    if (minDep.trim()) minimumDeposit = minDep.trim()

    const depLim = await input({ message: 'Maximum deposit limit per user (press Enter to skip):', validate: validateOptionalNonNegativeInt })
    if (depLim.trim()) depositLimit = depLim.trim()
  }

  return {
    allocation: allocationStr,
    quoteCap: quoteCapStr,
    bucketIndex,
    depositStart: toUnixTimestamp(depositStartStr),
    depositEnd: toUnixTimestamp(depositEndStr),
    claimStart: toUnixTimestamp(claimStartStr),
    claimEnd: claimEndStr.trim() ? toUnixTimestamp(claimEndStr) : '4102444800',
    ...(minimumDeposit && { minimumDeposit }),
    ...(depositLimit && { depositLimit }),
  }
}

export async function promptUnlockedBucket(nextIndex: number): Promise<UnlockedBucketResult> {
  const recipient = await promptPublicKeyInput('Recipient wallet address:')

  const allocationStr = await input({ message: 'Token allocation (in base units, default 0):', default: '0', validate: validateNonNegativeInt })
  const bucketIndexStr = await input({ message: 'Bucket index:', default: String(nextIndex), validate: validateNonNegativeInt })
  const bucketIndex = Number(bucketIndexStr)

  const claimStartStr = await input({ message: 'Claim start (ISO date or unix timestamp):', validate: (v) => validateTimestamp(v) })
  const claimEndStr = await input({ message: 'Claim end (ISO date or unix timestamp, press Enter for far future):', validate: (v) => validateTimestamp(v, { allowEmpty: true }) })

  return {
    recipient,
    allocation: allocationStr,
    bucketIndex,
    claimStart: toUnixTimestamp(claimStartStr),
    claimEnd: claimEndStr.trim() ? toUnixTimestamp(claimEndStr) : '4102444800',
  }
}

export async function promptBucketChoice(): Promise<BucketChoice> {
  return select({
    message: 'Add a bucket:',
    choices: [
      { name: 'Launch Pool — pro-rata allocation based on contributions', value: 'launch-pool' as const },
      { name: 'Presale — fixed-price token allocations', value: 'presale' as const },
      { name: 'Unlocked — team/treasury allocation', value: 'unlocked' as const },
      { name: 'Done — finish adding buckets', value: 'done' as const },
    ],
  })
}

/* ------------------------------------------------------------------ */
/*  API wizard prompts                                                 */
/* ------------------------------------------------------------------ */

export async function promptLaunchWizard(): Promise<LaunchWizardResult> {
  console.log('')
  console.log('--- Launch Type ---')
  const launchType = await select({
    message: 'Choose launch type:',
    choices: [
      { name: 'LaunchPool — Project-style launch with deposit period, raise goal, and Raydium LP', value: 'launchpool' as const },
      { name: 'Bonding Curve — Instant bonding curve launch with optional first buy and creator fees', value: 'bondingCurve' as const },
    ],
  })

  console.log('')
  console.log('--- Token Metadata ---')
  const tokenMeta = await promptTokenMetadata()

  console.log('')
  console.log('--- Social Links ---')
  const socials = await promptSocialLinks()

  console.log('')
  console.log('--- Launch Configuration ---')
  const quoteMintChoice = await promptQuoteMint()

  // Resolve quote mint to address for the config helper
  const resolvedQuoteMint = KNOWN_QUOTE_MINTS[quoteMintChoice] ?? quoteMintChoice
  const quoteName = Object.entries(KNOWN_QUOTE_MINTS).find(([, v]) => v === resolvedQuoteMint)?.[0] ?? 'custom'

  let depositStartTime: string | undefined
  let tokenAllocation: number | undefined
  let raiseGoal: number | undefined
  let raydiumLiquidityBps: number | undefined
  let fundsRecipient: string | undefined
  let creatorFeeWallet: string | undefined
  let firstBuyAmount: number | undefined

  if (launchType === 'launchpool') {
    const depositStartStr = await input({
      message: 'Deposit start time (ISO date or unix timestamp):',
      validate: (v) => validateTimestamp(v, { requireFuture: true }),
    })
    depositStartTime = toISOTimestamp(depositStartStr)

    const projectConfig = await promptProjectConfig(resolvedQuoteMint)
    tokenAllocation = projectConfig.tokenAllocation
    raiseGoal = projectConfig.raiseGoal
    raydiumLiquidityBps = projectConfig.raydiumLiquidityBps
    fundsRecipient = projectConfig.fundsRecipient
  } else {
    // Bonding curve config
    console.log('')
    console.log('--- Bonding Curve Options ---')
    const bcConfig = await promptBondingCurveConfig()
    creatorFeeWallet = bcConfig.creatorFeeWallet
    firstBuyAmount = bcConfig.firstBuyAmount
  }

  // Agent config
  console.log('')
  console.log('--- Agent Configuration ---')
  const agentConfig = await promptAgentConfig()

  // Summary
  console.log('')
  console.log('=== Launch Summary ===')
  console.log(`  Launch Type: ${launchType === 'launchpool' ? 'LaunchPool' : 'Bonding Curve'}`)
  console.log(`  Token: ${tokenMeta.name} (${tokenMeta.symbol})`)
  console.log(`  Image: ${tokenMeta.image}`)
  if (tokenMeta.description) console.log(`  Description: ${tokenMeta.description}`)
  if (socials.website) console.log(`  Website: ${socials.website}`)
  if (socials.twitter) console.log(`  Twitter: ${socials.twitter}`)
  if (socials.telegram) console.log(`  Telegram: ${socials.telegram}`)
  console.log(`  Quote Token: ${quoteName === 'custom' ? resolvedQuoteMint : quoteName}`)
  if (launchType === 'launchpool') {
    console.log(`  Deposit Start: ${depositStartTime}`)
    console.log(`  Token Allocation: ${tokenAllocation}`)
    console.log(`  Raise Goal: ${raiseGoal} ${quoteName}`)
    console.log(`  Raydium Liquidity: ${raydiumLiquidityBps! / 100}%`)
    console.log(`  Funds Recipient: ${fundsRecipient}`)
  } else {
    if (creatorFeeWallet) console.log(`  Creator Fee Wallet: ${creatorFeeWallet}`)
    if (firstBuyAmount) console.log(`  First Buy Amount: ${firstBuyAmount} SOL`)
    if (!creatorFeeWallet && !firstBuyAmount) console.log('  Using default bonding curve settings')
  }
  if (agentConfig.agentMint) {
    console.log(`  Agent Mint: ${agentConfig.agentMint}`)
    console.log(`  Set Token on Agent: ${agentConfig.agentSetToken ? 'Yes' : 'No'}`)
  }
  console.log('')

  const proceed = await confirm({ message: 'Create this launch?', default: true })
  if (!proceed) {
    console.log('Aborting wizard.')
    // eslint-disable-next-line no-process-exit, unicorn/no-process-exit
    process.exit(0)
  }

  return {
    launchType,
    ...tokenMeta,
    ...socials,
    quoteMint: quoteMintChoice,
    ...(depositStartTime && { depositStartTime }),
    ...(tokenAllocation !== undefined && { tokenAllocation }),
    ...(raiseGoal !== undefined && { raiseGoal }),
    ...(raydiumLiquidityBps !== undefined && { raydiumLiquidityBps }),
    ...(fundsRecipient && { fundsRecipient }),
    ...(creatorFeeWallet && { creatorFeeWallet }),
    ...(firstBuyAmount !== undefined && { firstBuyAmount }),
    ...(agentConfig.agentMint && { agentMint: agentConfig.agentMint }),
    ...(agentConfig.agentSetToken !== undefined && { agentSetToken: agentConfig.agentSetToken }),
  }
}

export async function promptRegisterLaunch(): Promise<RegisterLaunchResult> {
  console.log('')
  console.log('--- Platform Registration ---')
  console.log('Provide additional details to register on the Metaplex platform.')
  console.log('')

  const image = await input({
    message: 'Token image (https:// URL or local file path):',
    validate: (v) => {
      abortOrTrue(v)
      if (v.startsWith('https://')) return true
      if (v.startsWith('http://')) return 'Remote URLs must use https://'
      if (v.trim().length > 0) return true
      return 'Must be a valid https URL or a local file path'
    },
  })

  const description = await input({
    message: 'Token description (max 250 chars, press Enter to skip):',
    validate: (v) => { abortOrTrue(v); if (v.length > 250) return 'Max 250 characters'; return true },
  })

  console.log('')
  console.log('--- Social Links ---')
  const socials = await promptSocialLinks()

  console.log('')
  console.log('--- Launch Configuration ---')
  const quoteMintChoice = await promptQuoteMint()
  const resolvedQuoteMint = KNOWN_QUOTE_MINTS[quoteMintChoice] ?? quoteMintChoice

  const depositStartStr = await input({
    message: 'Deposit start time (ISO date or unix timestamp):',
    validate: (v) => validateTimestamp(v),
  })
  const depositStartTime = toISOTimestamp(depositStartStr)

  const projectConfig = await promptProjectConfig(resolvedQuoteMint)

  return {
    image,
    ...(description && { description }),
    ...socials,
    quoteMint: quoteMintChoice,
    depositStartTime,
    ...projectConfig,
  }
}
