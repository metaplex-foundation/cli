import {
  safeFetchGenesisAccountV2,
  findLaunchPoolBucketV2Pda,
  safeFetchLaunchPoolBucketV2,
} from '@metaplex-foundation/genesis'
import { publicKey } from '@metaplex-foundation/umi'
import { Args, Flags } from '@oclif/core'
import ora from 'ora'

import { TransactionCommand } from '../../../TransactionCommand.js'
import { generateExplorerUrl } from '../../../explorers.js'

// Key types from Genesis (enum values)
const KEY_TYPES: Record<number, string> = {
  0: 'Uninitialized',
  1: 'GenesisAccount',
  2: 'LaunchPoolBucket',
  3: 'LaunchPoolDeposit',
  4: 'StreamflowBucket',
  5: 'UnlockedBucket',
  6: 'MeteoraBucket',
  7: 'PumpBucket',
  8: 'DistributionBucket',
  9: 'PresaleBucket',
  10: 'PresaleDeposit',
  11: 'VaultBucket',
  12: 'VaultDeposit',
  13: 'BondingCurveBucket',
  14: 'AuctionBucket',
  15: 'AuctionBid',
  16: 'AuctionTree',
  17: 'RaydiumCpmmBucket',
  18: 'GenesisAccountV2',
  19: 'PresaleBucketV2',
  20: 'PresaleDepositV2',
  21: 'UnlockedBucketV2',
  22: 'RaydiumCpmmBucketV2',
  23: 'VaultBucketV2',
  24: 'VaultDepositV2',
  25: 'BondingCurveBucketV2',
  26: 'LaunchPoolBucketV2',
  27: 'LaunchPoolDepositV2',
}

function formatCondition(condition: { __kind: string; time?: bigint }): string {
  if (condition.__kind === 'TimeAbsolute' && condition.time) {
    const timestamp = Number(condition.time)
    if (timestamp === 0) return 'Not set'
    return new Date(timestamp * 1000).toISOString()
  }
  return `${condition.__kind}`
}

export default class BucketFetch extends TransactionCommand<typeof BucketFetch> {
  static override description = `Fetch a Genesis bucket by genesis address and bucket index.

This command retrieves and displays information about a bucket in a Genesis account.
Currently supports Launch Pool buckets (V2).`

  static override examples = [
    '$ mplx genesis bucket fetch GenesisAddress... --bucketIndex 0',
    '$ mplx genesis bucket fetch GenesisAddress... -b 1',
  ]

  static override usage = 'genesis bucket fetch [GENESIS] [FLAGS]'

  static override args = {
    genesis: Args.string({
      description: 'The Genesis account address',
      required: true,
    }),
  }

  static override flags = {
    bucketIndex: Flags.integer({
      char: 'b',
      description: 'Index of the bucket to fetch',
      default: 0,
    }),
  }

  public async run(): Promise<void> {
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

      // Find and fetch the launch pool bucket
      spinner.text = 'Fetching bucket details...'
      const bucketPda = findLaunchPoolBucketV2Pda(this.context.umi, {
        genesisAccount: genesisAddress,
        bucketIndex: flags.bucketIndex,
      })

      const bucket = await safeFetchLaunchPoolBucketV2(this.context.umi, bucketPda)

      if (!bucket) {
        spinner.fail('Bucket not found')
        this.error(`Launch pool bucket not found at index ${flags.bucketIndex}. It may be a different bucket type or not exist.`)
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
          publicKey(bucketPda),
          'account'
        )
      )

    } catch (error) {
      spinner.fail('Failed to fetch bucket')
      throw error
    }
  }
}
