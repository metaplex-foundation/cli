import {
  findBondingCurveBucketV2Pda,
  findLaunchPoolBucketV2Pda,
  findPresaleBucketV2Pda,
  findUnlockedBucketV2Pda,
  getCurrentPrice,
  getCurrentPriceComponents,
  getCurrentPriceQuotePerBase,
  getFillPercentage,
  isFirstBuyPending,
  isSoldOut,
  isSwappable,
  safeFetchBondingCurveBucketV2,
  safeFetchGenesisAccountV2,
  safeFetchLaunchPoolBucketV2,
  safeFetchPresaleBucketV2,
  safeFetchUnlockedBucketV2,
} from '@metaplex-foundation/genesis'
import { publicKey } from '@metaplex-foundation/umi'
import { Args, Flags } from '@oclif/core'
import ora from 'ora'

import { BaseCommand } from '../../../BaseCommand.js'
import { generateExplorerUrl } from '../../../explorers.js'
import { KEY_TYPES } from '../../../lib/genesis.js'

function formatCondition(condition: { __kind: string; time?: bigint }): string {
  if (condition.__kind === 'TimeAbsolute' && condition.time) {
    const timestamp = Number(condition.time)
    if (timestamp === 0) return 'Not set'
    return new Date(timestamp * 1000).toISOString()
  }

  return `${condition.__kind}`
}

export default class BucketFetch extends BaseCommand<typeof BucketFetch> {
  static override args = {
    genesis: Args.string({
      description: 'The Genesis account address',
      required: true,
    }),
  }

  static override description = `Fetch a Genesis bucket by genesis address and bucket index.

This command retrieves and displays information about a bucket in a Genesis account.
Supports Launch Pool, Presale, Unlocked, and Bonding Curve bucket types.

When --type is not specified, the command auto-detects the bucket type by trying
all known types at the given index.`

  static override examples = [
    '$ mplx genesis bucket fetch GenesisAddress...',
    '$ mplx genesis bucket fetch GenesisAddress... -b 1',
    '$ mplx genesis bucket fetch GenesisAddress... --type presale -b 0',
    '$ mplx genesis bucket fetch GenesisAddress... --type bonding-curve',
  ]

  static override flags = {
    bucketIndex: Flags.integer({
      char: 'b',
      default: 0,
      description: 'Index of the bucket to fetch',
    }),
    type: Flags.option({
      char: 't',
      description: 'Type of bucket to fetch (auto-detected if not specified)',
      options: ['launch-pool', 'presale', 'unlocked', 'bonding-curve'] as const,
      required: false,
    })(),
  }

  static override usage = 'genesis bucket fetch [GENESIS] [FLAGS]'

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(BucketFetch)
    const spinner = ora('Fetching bucket...').start()

    try {
      const genesisAddress = publicKey(args.genesis)

      // Fetch the Genesis account first
      spinner.text = 'Fetching Genesis account...'
      const genesisAccount = await safeFetchGenesisAccountV2(this.context.umi, genesisAddress)

      if (!genesisAccount) {
        spinner.fail('Genesis account not found')
        this.error(`Genesis account not found at address: ${args.genesis}`)
      }

      spinner.text = 'Fetching bucket details...'

      if (flags.type) {
        // Explicit type specified
        if (flags.type === 'presale') {
          return await this.fetchPresaleBucket(genesisAddress, flags.bucketIndex, spinner)
        }

 if (flags.type === 'unlocked') {
          return await this.fetchUnlockedBucket(genesisAddress, flags.bucketIndex, spinner)
        }

 if (flags.type === 'bonding-curve') {
          return await this.fetchBondingCurveBucket(genesisAddress, flags.bucketIndex, spinner)
        }
 
          return await this.fetchLaunchPoolBucket(genesisAddress, flags.bucketIndex, spinner)
        
      }

      // Auto-detect: try all bucket types at this index
      spinner.text = 'Detecting bucket type...'
      return await this.fetchAutoDetect(genesisAddress, flags.bucketIndex, spinner)

    } catch (error) {
      spinner.fail('Failed to fetch bucket')
      throw error
    }
  }

  private async fetchAutoDetect(genesisAddress: ReturnType<typeof publicKey>, bucketIndex: number, spinner: ReturnType<typeof ora>): Promise<unknown> {
    // Probe all bucket types at this index in parallel
    const [bc, lp, pre, ul] = await Promise.all([
      safeFetchBondingCurveBucketV2(this.context.umi, findBondingCurveBucketV2Pda(this.context.umi, { bucketIndex, genesisAccount: genesisAddress })[0]),
      safeFetchLaunchPoolBucketV2(this.context.umi, findLaunchPoolBucketV2Pda(this.context.umi, { bucketIndex, genesisAccount: genesisAddress })[0]),
      safeFetchPresaleBucketV2(this.context.umi, findPresaleBucketV2Pda(this.context.umi, { bucketIndex, genesisAccount: genesisAddress })[0]),
      safeFetchUnlockedBucketV2(this.context.umi, findUnlockedBucketV2Pda(this.context.umi, { bucketIndex, genesisAccount: genesisAddress })[0]),
    ])

    const found: { fn: () => Promise<unknown>; type: string }[] = []
    if (bc) found.push({ fn: () => this.fetchBondingCurveBucket(genesisAddress, bucketIndex, spinner), type: 'bonding-curve' })
    if (lp) found.push({ fn: () => this.fetchLaunchPoolBucket(genesisAddress, bucketIndex, spinner), type: 'launch-pool' })
    if (pre) found.push({ fn: () => this.fetchPresaleBucket(genesisAddress, bucketIndex, spinner), type: 'presale' })
    if (ul) found.push({ fn: () => this.fetchUnlockedBucket(genesisAddress, bucketIndex, spinner), type: 'unlocked' })

    if (found.length === 0) {
      spinner.fail('Bucket not found')
      this.error(`No bucket found at index ${bucketIndex}. Tried all bucket types (launch-pool, presale, unlocked, bonding-curve).`)
    }

    if (found.length === 1) {
      return found[0].fn()
    }

    // Multiple bucket types at the same index — show all
    spinner.succeed(`Found ${found.length} buckets at index ${bucketIndex}`)
    const results: unknown[] = await Promise.all(found.map(async ({ fn }) => {
      const result = await fn()
      this.log('')
      return result
    }))

    return results
  }

  private async fetchBondingCurveBucket(genesisAddress: ReturnType<typeof publicKey>, bucketIndex: number, spinner: ReturnType<typeof ora>): Promise<unknown> {
    const [bucketPda] = findBondingCurveBucketV2Pda(this.context.umi, {
      bucketIndex,
      genesisAccount: genesisAddress,
    })

    const bucket = await safeFetchBondingCurveBucketV2(this.context.umi, bucketPda)

    if (!bucket) {
      spinner.fail('Bucket not found')
      this.error(`Bonding curve bucket not found at index ${bucketIndex}. It may be a different bucket type or not exist.`)
    }

    spinner.succeed('Bucket fetched successfully!')

    const price = getCurrentPrice(bucket)
    const priceQuotePerBase = getCurrentPriceQuotePerBase(bucket)
    const { baseReserves, quoteReserves } = getCurrentPriceComponents(bucket)
    const firstBuyPending = isFirstBuyPending(bucket)
    const swappable = isSwappable(bucket)
    const soldOut = isSoldOut(bucket)
    const fillPct = getFillPercentage(bucket)

    this.log('')
    this.logSuccess(`Bonding Curve Bucket`)
    this.log('')
    this.log('Bucket Details:')
    this.log(`  Address: ${bucketPda}`)
    this.log(`  Type: ${KEY_TYPES[bucket.key] || 'BondingCurveV2'}`)
    this.log(`  Genesis Account: ${bucket.bucket.genesis}`)
    this.log(`  Bucket Index: ${bucket.bucket.bucketIndex}`)
    this.log('')
    this.log('Allocation:')
    this.log(`  Base Token Allocation: ${bucket.bucket.baseTokenAllocation.toString()}`)
    this.log(`  Base Token Balance: ${bucket.bucket.baseTokenBalance.toString()}`)
    this.log(`  Quote Token Deposit Total: ${bucket.quoteTokenDepositTotal.toString()}`)
    this.log('')
    this.log('Pricing:')
    this.log(`  Current Price (tokens per quote): ${price.toString()}`)
    this.log(`  Current Price (quote per token): ${priceQuotePerBase.toString()}`)
    this.log(`  Base Reserves: ${baseReserves.toString()}`)
    this.log(`  Quote Reserves: ${quoteReserves.toString()}`)
    this.log('')
    this.log('Constant Product Params:')
    this.log(`  Virtual SOL: ${bucket.constantProductParams.virtualSol.toString()}`)
    this.log(`  Virtual Tokens: ${bucket.constantProductParams.virtualTokens.toString()}`)
    this.log('')
    this.log('Status:')
    this.log(`  First Buy Pending: ${firstBuyPending ? 'Yes' : 'No'}`)
    this.log(`  Swappable: ${swappable ? 'Yes' : 'No'}`)
    this.log(`  Sold Out: ${soldOut ? 'Yes' : 'No'}`)
    this.log(`  Fill Percentage: ${fillPct.toFixed(2)}%`)
    this.log('')
    this.log('Conditions:')
    this.log(`  Swap Start: ${formatCondition(bucket.swapStartCondition)}`)
    this.log(`  Swap End: ${formatCondition(bucket.swapEndCondition)}`)
    this.log('')
    this.log('Fees:')
    this.log(`  Deposit Fee: ${bucket.depositFee.toString()}`)
    this.log(`  Withdraw Fee: ${bucket.withdrawFee.toString()}`)
    this.log(`  Creator Fee Accrued: ${bucket.creatorFeeAccrued.toString()}`)
    this.log(`  Creator Fee Claimed: ${bucket.creatorFeeClaimed.toString()}`)
    this.log('')
    this.log('View on Explorer:')
    this.log(
      generateExplorerUrl(
        this.context.explorer,
        this.context.chain,
        bucketPda,
        'account'
      )
    )

    return {
      address: bucketPda.toString(),
      baseReserves: baseReserves.toString(),
      baseTokenAllocation: bucket.bucket.baseTokenAllocation.toString(),
      baseTokenBalance: bucket.bucket.baseTokenBalance.toString(),
      bucketIndex: bucket.bucket.bucketIndex,
      creatorFeeAccrued: bucket.creatorFeeAccrued.toString(),
      creatorFeeClaimed: bucket.creatorFeeClaimed.toString(),
      currentPrice: price.toString(),
      currentPriceQuotePerBase: priceQuotePerBase.toString(),
      explorer: generateExplorerUrl(this.context.explorer, this.context.chain, bucketPda, 'account'),
      fillPercentage: fillPct,
      firstBuyPending,
      genesisAccount: bucket.bucket.genesis.toString(),
      quoteReserves: quoteReserves.toString(),
      quoteTokenDepositTotal: bucket.quoteTokenDepositTotal.toString(),
      soldOut,
      swappable,
      type: 'bonding-curve',
      virtualSol: bucket.constantProductParams.virtualSol.toString(),
      virtualTokens: bucket.constantProductParams.virtualTokens.toString(),
    }
  }

  private async fetchLaunchPoolBucket(genesisAddress: ReturnType<typeof publicKey>, bucketIndex: number, spinner: ReturnType<typeof ora>): Promise<unknown> {
    const [bucketPda] = findLaunchPoolBucketV2Pda(this.context.umi, {
      bucketIndex,
      genesisAccount: genesisAddress,
    })

    const bucket = await safeFetchLaunchPoolBucketV2(this.context.umi, bucketPda)

    if (!bucket) {
      spinner.fail('Bucket not found')
      this.error(`Launch pool bucket not found at index ${bucketIndex}. It may be a different bucket type or not exist.`)
    }

    spinner.succeed('Bucket fetched successfully!')

    this.log('')
    this.logSuccess(`Launch Pool Bucket`)
    this.log('')
    this.log('Bucket Details:')
    this.log(`  Address: ${bucketPda}`)
    this.log(`  Type: ${KEY_TYPES[bucket.key] || 'Unknown'}`)
    this.log(`  Genesis Account: ${bucket.bucket.genesis}`)
    this.log(`  Bucket Index: ${bucket.bucket.bucketIndex}`)
    this.log('')
    this.log('Allocation:')
    this.log(`  Base Token Allocation: ${bucket.bucket.baseTokenAllocation.toString()}`)
    this.log(`  Base Token Balance: ${bucket.bucket.baseTokenBalance.toString()}`)
    this.log('')
    this.log('Deposits:')
    this.log(`  Deposit Count: ${bucket.depositCount.toString()}`)
    this.log(`  Total Quote Tokens Deposited: ${bucket.quoteTokenDepositTotal.toString()}`)
    this.log(`  Weighted Quote Token Total: ${bucket.weightedQuoteTokenTotal.toString()}`)
    this.log('')
    this.log('Claims:')
    this.log(`  Claim Count: ${bucket.claimCount.toString()}`)
    this.log('')
    this.log('Schedule:')
    this.log(`  Deposit Start: ${formatCondition(bucket.depositStartCondition)}`)
    this.log(`  Deposit End: ${formatCondition(bucket.depositEndCondition)}`)
    this.log(`  Claim Start: ${formatCondition(bucket.claimStartCondition)}`)
    this.log(`  Claim End: ${formatCondition(bucket.claimEndCondition)}`)
    this.log('')
    this.log('Fees:')
    this.log(`  Deposit Fee: ${bucket.depositFee.toString()}`)
    this.log(`  Withdraw Fee: ${bucket.withdrawFee.toString()}`)
    this.log(`  Claim Fee: ${bucket.claimFee.toString()}`)
    this.log('')
    this.log('View on Explorer:')
    this.log(
      generateExplorerUrl(
        this.context.explorer,
        this.context.chain,
        bucketPda,
        'account'
      )
    )

    return {
      address: bucketPda.toString(),
      baseTokenAllocation: bucket.bucket.baseTokenAllocation.toString(),
      baseTokenBalance: bucket.bucket.baseTokenBalance.toString(),
      bucketIndex: bucket.bucket.bucketIndex,
      explorer: generateExplorerUrl(this.context.explorer, this.context.chain, bucketPda, 'account'),
      genesisAccount: bucket.bucket.genesis.toString(),
      type: 'launch-pool',
    }
  }

  private async fetchPresaleBucket(genesisAddress: ReturnType<typeof publicKey>, bucketIndex: number, spinner: ReturnType<typeof ora>): Promise<unknown> {
    const [bucketPda] = findPresaleBucketV2Pda(this.context.umi, {
      bucketIndex,
      genesisAccount: genesisAddress,
    })

    const bucket = await safeFetchPresaleBucketV2(this.context.umi, bucketPda)

    if (!bucket) {
      spinner.fail('Bucket not found')
      this.error(`Presale bucket not found at index ${bucketIndex}. It may be a different bucket type or not exist.`)
    }

    spinner.succeed('Bucket fetched successfully!')

    this.log('')
    this.logSuccess(`Presale Bucket`)
    this.log('')
    this.log('Bucket Details:')
    this.log(`  Address: ${bucketPda}`)
    this.log(`  Type: ${KEY_TYPES[bucket.key] || 'Unknown'}`)
    this.log(`  Genesis Account: ${bucket.bucket.genesis}`)
    this.log(`  Bucket Index: ${bucket.bucket.bucketIndex}`)
    this.log('')
    this.log('Allocation:')
    this.log(`  Base Token Allocation: ${bucket.bucket.baseTokenAllocation.toString()}`)
    this.log(`  Base Token Balance: ${bucket.bucket.baseTokenBalance.toString()}`)
    this.log(`  Quote Token Cap: ${bucket.allocationQuoteTokenCap.toString()}`)
    this.log('')
    this.log('Deposits:')
    this.log(`  Deposit Count: ${bucket.depositCount.toString()}`)
    this.log(`  Total Quote Tokens Deposited: ${bucket.quoteTokenDepositTotal.toString()}`)
    this.log('')
    this.log('Claims:')
    this.log(`  Claim Count: ${bucket.claimCount.toString()}`)
    this.log('')
    this.log('Schedule:')
    this.log(`  Deposit Start: ${formatCondition(bucket.depositStartCondition)}`)
    this.log(`  Deposit End: ${formatCondition(bucket.depositEndCondition)}`)
    this.log(`  Claim Start: ${formatCondition(bucket.claimStartCondition)}`)
    this.log(`  Claim End: ${formatCondition(bucket.claimEndCondition)}`)
    this.log('')
    this.log('Fees:')
    this.log(`  Deposit Fee: ${bucket.depositFee.toString()}`)
    this.log(`  Claim Fee: ${bucket.claimFee.toString()}`)
    this.log('')
    this.log('View on Explorer:')
    this.log(
      generateExplorerUrl(
        this.context.explorer,
        this.context.chain,
        bucketPda,
        'account'
      )
    )

    return {
      address: bucketPda.toString(),
      allocationQuoteTokenCap: bucket.allocationQuoteTokenCap.toString(),
      baseTokenAllocation: bucket.bucket.baseTokenAllocation.toString(),
      baseTokenBalance: bucket.bucket.baseTokenBalance.toString(),
      bucketIndex: bucket.bucket.bucketIndex,
      explorer: generateExplorerUrl(this.context.explorer, this.context.chain, bucketPda, 'account'),
      genesisAccount: bucket.bucket.genesis.toString(),
      type: 'presale',
    }
  }

  private async fetchUnlockedBucket(genesisAddress: ReturnType<typeof publicKey>, bucketIndex: number, spinner: ReturnType<typeof ora>): Promise<unknown> {
    const [bucketPda] = findUnlockedBucketV2Pda(this.context.umi, {
      bucketIndex,
      genesisAccount: genesisAddress,
    })

    const bucket = await safeFetchUnlockedBucketV2(this.context.umi, bucketPda)

    if (!bucket) {
      spinner.fail('Bucket not found')
      this.error(`Unlocked bucket not found at index ${bucketIndex}. It may be a different bucket type or not exist.`)
    }

    spinner.succeed('Bucket fetched successfully!')

    this.log('')
    this.logSuccess(`Unlocked Bucket`)
    this.log('')
    this.log('Bucket Details:')
    this.log(`  Address: ${bucketPda}`)
    this.log(`  Type: ${KEY_TYPES[bucket.key] || 'Unknown'}`)
    this.log(`  Genesis Account: ${bucket.bucket.genesis}`)
    this.log(`  Bucket Index: ${bucket.bucket.bucketIndex}`)
    this.log('')
    this.log('Allocation:')
    this.log(`  Base Token Allocation: ${bucket.bucket.baseTokenAllocation.toString()}`)
    this.log(`  Base Token Balance: ${bucket.bucket.baseTokenBalance.toString()}`)
    this.log('')
    this.log('Recipient:')
    this.log(`  Recipient: ${bucket.recipient}`)
    this.log(`  Claimed: ${bucket.claimed ? 'Yes' : 'No'}`)
    this.log('')
    this.log('Schedule:')
    this.log(`  Claim Start: ${formatCondition(bucket.claimStartCondition)}`)
    this.log(`  Claim End: ${formatCondition(bucket.claimEndCondition)}`)
    this.log('')
    this.log('View on Explorer:')
    this.log(
      generateExplorerUrl(
        this.context.explorer,
        this.context.chain,
        bucketPda,
        'account'
      )
    )

    return {
      address: bucketPda.toString(),
      baseTokenAllocation: bucket.bucket.baseTokenAllocation.toString(),
      baseTokenBalance: bucket.bucket.baseTokenBalance.toString(),
      bucketIndex: bucket.bucket.bucketIndex,
      claimed: bucket.claimed,
      explorer: generateExplorerUrl(this.context.explorer, this.context.chain, bucketPda, 'account'),
      genesisAccount: bucket.bucket.genesis.toString(),
      recipient: bucket.recipient.toString(),
      type: 'unlocked',
    }
  }
}
