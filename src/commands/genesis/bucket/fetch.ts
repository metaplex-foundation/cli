import {
  fetchLaunchPoolBucketV2,
  fetchUnlockedBucketV2,
  isCondition,
} from '@metaplex-foundation/genesis'
import { publicKey } from '@metaplex-foundation/umi'
import { Args, Flags } from '@oclif/core'
import ora from 'ora'

import { TransactionCommand } from '../../../TransactionCommand.js'
import { generateExplorerUrl } from '../../../explorers.js'

export default class BucketFetch extends TransactionCommand<typeof BucketFetch> {
  static override description = `Fetch details of a bucket from a Genesis Account.

Retrieves and displays information about a specific bucket, including its configuration,
allocation, timing parameters, and current state.`

  static override examples = [
    '$ mplx genesis bucket fetch BucketAddr... --type launch-pool',
    '$ mplx genesis bucket fetch BucketAddr... --type unlocked',
  ]

  static override flags = {
    type: Flags.option({
      char: 't',
      description: 'Type of bucket to fetch',
      options: ['launch-pool', 'unlocked'] as const,
      required: true,
    })(),
  }

  static override args = {
    bucket: Args.string({
      description: 'The bucket address to fetch',
      required: true,
    }),
  }

  static override usage = 'genesis bucket fetch [BUCKET] [FLAGS]'

  private formatConditionTime(condition: { __kind: string; time?: bigint }): string | null {
    if (condition.__kind === 'TimeAbsolute' && condition.time && Number(condition.time) > 0) {
      const date = new Date(Number(condition.time) * 1000)
      return `${date.toISOString()} (${date.toLocaleString()})`
    }
    return null
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(BucketFetch)
    const spinner = ora('Fetching bucket...').start()

    try {
      const bucketAddress = publicKey(args.bucket)

      if (flags.type === 'launch-pool') {
        const bucket = await fetchLaunchPoolBucketV2(this.context.umi, bucketAddress)

        spinner.succeed('Launch Pool bucket fetched successfully!')

        this.log('')
        this.logSuccess(`Bucket: ${bucketAddress}`)
        this.log('')
        this.log('Launch Pool Bucket Details:')
        this.log(`  Genesis Account: ${bucket.bucket.genesis}`)
        this.log(`  Bucket Index: ${bucket.bucket.bucketIndex}`)
        this.log(`  Base Token Allocation: ${bucket.bucket.baseTokenAllocation.toString()}`)
        this.log(`  Base Token Balance: ${bucket.bucket.baseTokenBalance.toString()}`)
        this.log(`  Quote Token Balance: ${bucket.bucket.quoteTokenBalance.toString()}`)
        this.log(`  Total Deposits: ${bucket.quoteTokenDepositTotal.toString()}`)
        this.log(`  Deposit Count: ${bucket.depositCount.toString()}`)
        this.log(`  Claim Count: ${bucket.claimCount.toString()}`)

        const depositStart = this.formatConditionTime(bucket.depositStartCondition)
        const depositEnd = this.formatConditionTime(bucket.depositEndCondition)

        if (depositStart) {
          this.log(`  Deposit Start: ${depositStart}`)
        }
        if (depositEnd) {
          this.log(`  Deposit End: ${depositEnd}`)
        }

        const claimStart = this.formatConditionTime(bucket.claimStartCondition)
        const claimEnd = this.formatConditionTime(bucket.claimEndCondition)

        if (claimStart) {
          this.log(`  Claim Start: ${claimStart}`)
        }
        if (claimEnd) {
          this.log(`  Claim End: ${claimEnd}`)
        }

        // Determine status
        const now = new Date()
        let status = 'Not Started'
        if (bucket.depositStartCondition.__kind === 'TimeAbsolute' && bucket.depositEndCondition.__kind === 'TimeAbsolute') {
          const startTime = new Date(Number(bucket.depositStartCondition.time) * 1000)
          const endTime = new Date(Number(bucket.depositEndCondition.time) * 1000)
          if (now >= startTime && now <= endTime) {
            status = 'Deposit Active'
          } else if (now > endTime) {
            status = 'Deposit Ended'
          }
        }
        this.log(`  Status: ${status}`)
      } else {
        // unlocked bucket
        const bucket = await fetchUnlockedBucketV2(this.context.umi, bucketAddress)

        spinner.succeed('Unlocked bucket fetched successfully!')

        this.log('')
        this.logSuccess(`Bucket: ${bucketAddress}`)
        this.log('')
        this.log('Unlocked Bucket Details:')
        this.log(`  Genesis Account: ${bucket.bucket.genesis}`)
        this.log(`  Bucket Index: ${bucket.bucket.bucketIndex}`)
        this.log(`  Base Token Allocation: ${bucket.bucket.baseTokenAllocation.toString()}`)
        this.log(`  Base Token Balance: ${bucket.bucket.baseTokenBalance.toString()}`)
        this.log(`  Quote Token Balance: ${bucket.bucket.quoteTokenBalance.toString()}`)
        this.log(`  Recipient: ${bucket.recipient}`)
        this.log(`  Claimed: ${bucket.claimed}`)

        const claimStart = this.formatConditionTime(bucket.claimStartCondition)
        const claimEnd = this.formatConditionTime(bucket.claimEndCondition)

        if (claimStart) {
          this.log(`  Claim Start: ${claimStart}`)
        }
        if (claimEnd) {
          this.log(`  Claim End: ${claimEnd}`)
        }
      }

      this.log('')
      this.log('View on Explorer:')
      this.log(
        generateExplorerUrl(
          this.context.explorer,
          this.context.chain,
          bucketAddress,
          'account'
        )
      )
    } catch (error) {
      spinner.fail('Failed to fetch bucket')
      if (error instanceof Error && error.message.includes('Account does not exist')) {
        this.error(`Bucket not found at address: ${args.bucket}`)
      }
      throw error
    }
  }
}
