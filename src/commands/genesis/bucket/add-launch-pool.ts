import {
  addLaunchPoolBucketV2,
  safeFetchGenesisAccountV2,
  findLaunchPoolBucketV2Pda,
} from '@metaplex-foundation/genesis'
import { publicKey, some, none } from '@metaplex-foundation/umi'
import { Args, Flags } from '@oclif/core'
import ora from 'ora'

import { TransactionCommand } from '../../../TransactionCommand.js'
import { generateExplorerUrl } from '../../../explorers.js'
import { txSignatureToString } from '../../../lib/util.js'
import umiSendAndConfirmTransaction from '../../../lib/umi/sendAndConfirm.js'

export default class AddLaunchPool extends TransactionCommand<typeof AddLaunchPool> {
  static override description = `Add a launch pool bucket to a Genesis account.

Launch pools use a pro-rata allocation model where:
- Everyone gets the same price
- Allocation is based on contribution relative to total contributions
- No frontrunning or sniping possible

The bucket requires start/end conditions for deposits and claims.
Use Unix timestamps for absolute times.`

  static override examples = [
    '$ mplx genesis bucket add-launch-pool GenesisAddress... --allocation 500000000 --depositStart 1704067200 --depositEnd 1704153600 --claimStart 1704153600',
    '$ mplx genesis bucket add-launch-pool GenesisAddress... --allocation 1000000000 --depositStart 1704067200 --depositEnd 1704153600 --claimStart 1704153600 --claimEnd 1704240000',
  ]

  static override usage = 'genesis bucket add-launch-pool [GENESIS] [FLAGS]'

  static override args = {
    genesis: Args.string({
      description: 'The Genesis account address',
      required: true,
    }),
  }

  static override flags = {
    allocation: Flags.string({
      char: 'a',
      description: 'Base token allocation for this bucket (in base units)',
      required: true,
    }),
    depositStart: Flags.string({
      description: 'Unix timestamp when deposits start',
      required: true,
    }),
    depositEnd: Flags.string({
      description: 'Unix timestamp when deposits end',
      required: true,
    }),
    claimStart: Flags.string({
      description: 'Unix timestamp when claims start',
      required: true,
    }),
    claimEnd: Flags.string({
      description: 'Unix timestamp when claims end (optional, 0 for no end)',
      default: '0',
    }),
    bucketIndex: Flags.integer({
      char: 'b',
      description: 'Bucket index (default: auto-increment based on genesis bucket count)',
      required: false,
    }),
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(AddLaunchPool)
    const spinner = ora('Adding launch pool bucket...').start()

    try {
      const genesisAddress = publicKey(args.genesis)

      // Fetch the Genesis account
      spinner.text = 'Fetching Genesis account details...'
      const genesisAccount = await safeFetchGenesisAccountV2(this.context.umi, genesisAddress)

      if (!genesisAccount) {
        spinner.fail('Genesis account not found')
        this.error(`Genesis account not found at address: ${args.genesis}`)
      }

      if (genesisAccount.finalized) {
        spinner.fail('Genesis account is already finalized')
        this.error('Cannot add buckets to a finalized Genesis account')
      }

      // Determine bucket index
      const bucketIndex = flags.bucketIndex ?? genesisAccount.bucketCount

      // Parse timestamps
      const depositStart = BigInt(flags.depositStart)
      const depositEnd = BigInt(flags.depositEnd)
      const claimStart = BigInt(flags.claimStart)
      const claimEnd = BigInt(flags.claimEnd)

      // Parse allocation
      const allocation = BigInt(flags.allocation)

      // Build conditions
      const depositStartCondition = {
        __kind: 'TimeAbsolute' as const,
        padding: [0, 0, 0, 0, 0, 0, 0],
        time: depositStart,
        triggeredTimestamp: BigInt(0),
      }

      const depositEndCondition = {
        __kind: 'TimeAbsolute' as const,
        padding: [0, 0, 0, 0, 0, 0, 0],
        time: depositEnd,
        triggeredTimestamp: BigInt(0),
      }

      const claimStartCondition = {
        __kind: 'TimeAbsolute' as const,
        padding: [0, 0, 0, 0, 0, 0, 0],
        time: claimStart,
        triggeredTimestamp: BigInt(0),
      }

      const claimEndCondition = {
        __kind: 'TimeAbsolute' as const,
        padding: [0, 0, 0, 0, 0, 0, 0],
        time: claimEnd,
        triggeredTimestamp: BigInt(0),
      }

      // Build the add bucket transaction
      spinner.text = 'Adding launch pool bucket...'
      const transaction = addLaunchPoolBucketV2(this.context.umi, {
        genesisAccount: genesisAddress,
        baseMint: genesisAccount.baseMint,
        quoteMint: genesisAccount.quoteMint,
        authority: this.context.signer,
        payer: this.context.payer,
        bucketIndex,
        baseTokenAllocation: allocation,
        depositStartCondition,
        depositEndCondition,
        claimStartCondition,
        claimEndCondition,
        backendSigner: none(),
        penaltyWallet: none(),
        depositPenalty: none(),
        withdrawPenalty: none(),
        bonusSchedule: none(),
        depositLimit: none(),
        allowlist: none(),
        claimSchedule: none(),
        minimumDepositAmount: none(),
        minimumQuoteTokenThreshold: none(),
        endBehaviors: [],
      })

      const result = await umiSendAndConfirmTransaction(this.context.umi, transaction)

      // Get the bucket PDA
      const bucketPda = findLaunchPoolBucketV2Pda(this.context.umi, {
        genesisAccount: genesisAddress,
        bucketIndex,
      })

      spinner.succeed('Launch pool bucket added successfully!')

      this.log('')
      this.logSuccess(`Launch Pool Bucket Added`)
      this.log('')
      this.log('Bucket Details:')
      this.log(`  Genesis Account: ${genesisAddress}`)
      this.log(`  Bucket Address: ${bucketPda}`)
      this.log(`  Bucket Index: ${bucketIndex}`)
      this.log(`  Token Allocation: ${flags.allocation}`)
      this.log('')
      this.log('Schedule:')
      this.log(`  Deposit Start: ${new Date(Number(depositStart) * 1000).toISOString()}`)
      this.log(`  Deposit End: ${new Date(Number(depositEnd) * 1000).toISOString()}`)
      this.log(`  Claim Start: ${new Date(Number(claimStart) * 1000).toISOString()}`)
      if (claimEnd > 0) {
        this.log(`  Claim End: ${new Date(Number(claimEnd) * 1000).toISOString()}`)
      } else {
        this.log(`  Claim End: No end (unlimited)`)
      }
      this.log('')
      this.log(`Transaction: ${txSignatureToString(result.transaction.signature as Uint8Array)}`)
      this.log('')
      this.log(
        generateExplorerUrl(
          this.context.explorer,
          this.context.chain,
          txSignatureToString(result.transaction.signature as Uint8Array),
          'transaction'
        )
      )

    } catch (error) {
      spinner.fail('Failed to add launch pool bucket')
      throw error
    }
  }
}
