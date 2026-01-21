import {
  fetchGenesisAccountV2,
  findLaunchPoolBucketV2Pda,
  findUnlockedBucketV2Pda,
  safeFetchLaunchPoolBucketV2,
  safeFetchUnlockedBucketV2,
  LaunchPoolBucketV2,
  UnlockedBucketV2,
} from '@metaplex-foundation/genesis'
import { publicKey, PublicKey } from '@metaplex-foundation/umi'
import { Args, Flags } from '@oclif/core'
import ora from 'ora'

import { TransactionCommand } from '../../../TransactionCommand.js'
import { generateExplorerUrl } from '../../../explorers.js'

export default class BucketList extends TransactionCommand<typeof BucketList> {
  static override description = `List all buckets in a Genesis Account.

Retrieves and displays information about all buckets configured in the Genesis Account,
including their types, allocations, and timing parameters.`

  static override examples = [
    '$ mplx genesis bucket list GenesisAddr...',
    '$ mplx genesis bucket list GenesisAddr... --maxBuckets 10',
  ]

  static override flags = {
    maxBuckets: Flags.integer({
      default: 20,
      description: 'Maximum number of buckets to check',
      required: false,
    }),
  }

  static override args = {
    genesis: Args.string({
      description: 'The Genesis Account address',
      required: true,
    }),
  }

  static override usage = 'genesis bucket list [GENESIS]'

  private formatConditionTime(condition: { __kind: string; time?: bigint }): string | null {
    if (condition.__kind === 'TimeAbsolute' && condition.time && Number(condition.time) > 0) {
      return new Date(Number(condition.time) * 1000).toISOString()
    }
    return null
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(BucketList)
    const spinner = ora('Fetching buckets from Genesis Account...').start()

    try {
      const genesisAddress = publicKey(args.genesis)

      // Fetch the Genesis Account first to validate it exists
      await fetchGenesisAccountV2(this.context.umi, genesisAddress)

      spinner.text = 'Scanning for buckets...'

      const launchPoolBuckets: Array<{ index: number; bucket: LaunchPoolBucketV2; address: PublicKey }> = []
      const unlockedBuckets: Array<{ index: number; bucket: UnlockedBucketV2; address: PublicKey }> = []

      // Scan for buckets
      for (let i = 0; i < flags.maxBuckets; i++) {
        // Try to find launch pool bucket at this index
        const [launchPoolPda] = findLaunchPoolBucketV2Pda(this.context.umi, {
          genesisAccount: genesisAddress,
          bucketIndex: i,
        })

        const launchPool = await safeFetchLaunchPoolBucketV2(this.context.umi, launchPoolPda)
        if (launchPool) {
          launchPoolBuckets.push({ index: i, bucket: launchPool, address: launchPoolPda })
        }

        // Try to find unlocked bucket at this index
        const [unlockedPda] = findUnlockedBucketV2Pda(this.context.umi, {
          genesisAccount: genesisAddress,
          bucketIndex: i,
        })

        const unlocked = await safeFetchUnlockedBucketV2(this.context.umi, unlockedPda)
        if (unlocked) {
          unlockedBuckets.push({ index: i, bucket: unlocked, address: unlockedPda })
        }
      }

      const totalBuckets = launchPoolBuckets.length + unlockedBuckets.length

      if (totalBuckets === 0) {
        spinner.warn('No buckets found in Genesis Account')
        this.log('')
        this.log(`Genesis Account: ${genesisAddress}`)
        this.log('No buckets have been added yet.')
        return
      }

      spinner.succeed(`Found ${totalBuckets} bucket(s)!`)

      this.log('')
      this.logSuccess(`Genesis Account: ${genesisAddress}`)
      this.log(`Total Buckets: ${totalBuckets}`)
      this.log('')

      // Display Launch Pool Buckets
      if (launchPoolBuckets.length > 0) {
        this.log('Launch Pool Buckets:')
        this.log('-'.repeat(60))

        for (const { index, bucket, address } of launchPoolBuckets) {
          const depositStart = this.formatConditionTime(bucket.depositStartCondition)
          const depositEnd = this.formatConditionTime(bucket.depositEndCondition)
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

          this.log(`  [${index}] ${address}`)
          this.log(`      Allocation: ${bucket.bucket.baseTokenAllocation.toString()}`)
          this.log(`      Total Deposits: ${bucket.quoteTokenDepositTotal.toString()}`)
          if (depositStart && depositEnd) {
            this.log(`      Deposit Window: ${depositStart} - ${depositEnd}`)
          }
          this.log(`      Status: ${status}`)
          this.log('')
        }
      }

      // Display Unlocked Buckets
      if (unlockedBuckets.length > 0) {
        this.log('Unlocked Buckets:')
        this.log('-'.repeat(60))

        for (const { index, bucket, address } of unlockedBuckets) {
          this.log(`  [${index}] ${address}`)
          this.log(`      Allocation: ${bucket.bucket.baseTokenAllocation.toString()}`)
          this.log(`      Base Token Balance: ${bucket.bucket.baseTokenBalance.toString()}`)
          this.log(`      Recipient: ${bucket.recipient}`)
          this.log(`      Claimed: ${bucket.claimed}`)
          this.log('')
        }
      }

      this.log('View Genesis Account on Explorer:')
      this.log(
        generateExplorerUrl(
          this.context.explorer,
          this.context.chain,
          genesisAddress,
          'account'
        )
      )
    } catch (error) {
      spinner.fail('Failed to list buckets')
      if (error instanceof Error && error.message.includes('Account does not exist')) {
        this.error(`Genesis Account not found at address: ${args.genesis}`)
      }
      throw error
    }
  }
}
