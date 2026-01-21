import {
  addLaunchPoolBucketV2,
  addUnlockedBucketV2,
  findLaunchPoolBucketV2Pda,
  findUnlockedBucketV2Pda,
  NOT_TRIGGERED_TIMESTAMP,
} from '@metaplex-foundation/genesis'
import { publicKey } from '@metaplex-foundation/umi'
import { Args, Flags } from '@oclif/core'
import ora from 'ora'

import { TransactionCommand } from '../../../TransactionCommand.js'
import { generateExplorerUrl } from '../../../explorers.js'
import { txSignatureToString } from '../../../lib/util.js'
import umiSendAndConfirmTransaction from '../../../lib/umi/sendAndConfirm.js'

export default class BucketAdd extends TransactionCommand<typeof BucketAdd> {
  static override description = `Add a bucket to a Genesis Account.

Buckets are modular components that define how tokens flow in and out of your launch.

Bucket Types:
  - launch-pool: Collects deposits during a window and distributes tokens proportionally
  - unlocked: Destination bucket for forwarded SOL from launch pools

Note: Once a Genesis Account is finalized, you cannot add more buckets.`

  static override examples = [
    '$ mplx genesis bucket add GenesisAddr... --type launch-pool --baseMint TokenMint... --allocation 1000000000000 --depositStart "2024-01-01T00:00:00Z" --depositEnd "2024-01-31T23:59:59Z"',
    '$ mplx genesis bucket add GenesisAddr... --type unlocked --baseMint TokenMint... --allocation 500000000000',
  ]

  static override flags = {
    type: Flags.option({
      char: 't',
      description: 'Type of bucket to add',
      options: ['launch-pool', 'unlocked'] as const,
      required: true,
    })(),
    baseMint: Flags.string({
      char: 'm',
      description: 'Base token mint address',
      required: true,
    }),
    allocation: Flags.string({
      char: 'a',
      description: 'Token allocation for this bucket (in base units)',
      required: false,
    }),
    depositStart: Flags.string({
      description: 'Start time for deposits (ISO date string, launch-pool only)',
      required: false,
    }),
    depositEnd: Flags.string({
      description: 'End time for deposits (ISO date string, launch-pool only)',
      required: false,
    }),
    claimStart: Flags.string({
      description: 'Start time for claims (ISO date string)',
      required: false,
    }),
    claimEnd: Flags.string({
      description: 'End time for claims (ISO date string)',
      required: false,
    }),
    recipient: Flags.string({
      description: 'Recipient address for unlocked bucket (defaults to signer)',
      required: false,
    }),
    bucketIndex: Flags.integer({
      char: 'i',
      description: 'Bucket index (defaults to next available)',
      required: false,
    }),
  }

  static override args = {
    genesis: Args.string({
      description: 'The Genesis Account address',
      required: true,
    }),
  }

  static override usage = 'genesis bucket add [GENESIS] [FLAGS]'

  private createTimeAbsoluteCondition(isoDateString: string | undefined) {
    const time = isoDateString
      ? BigInt(Math.floor(new Date(isoDateString).getTime() / 1000))
      : 0n
    return {
      __kind: 'TimeAbsolute' as const,
      padding: [0, 0, 0, 0, 0, 0, 0],
      time,
      triggeredTimestamp: NOT_TRIGGERED_TIMESTAMP,
    }
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(BucketAdd)

    const spinner = ora('Adding bucket to Genesis Account...').start()

    try {
      const genesisAccount = publicKey(args.genesis)
      const baseMint = publicKey(flags.baseMint)
      const baseTokenAllocation = flags.allocation ? BigInt(flags.allocation) : 0n
      const bucketIndex = flags.bucketIndex ?? 0

      let result
      let bucketPda

      if (flags.type === 'launch-pool') {
        // Validate required flags for launch-pool
        if (!flags.depositStart || !flags.depositEnd) {
          throw new Error('Launch pool bucket requires --depositStart and --depositEnd flags')
        }

        const depositStartCondition = this.createTimeAbsoluteCondition(flags.depositStart)
        const depositEndCondition = this.createTimeAbsoluteCondition(flags.depositEnd)
        const claimStartCondition = this.createTimeAbsoluteCondition(flags.claimStart)
        const claimEndCondition = this.createTimeAbsoluteCondition(flags.claimEnd)

        const transaction = addLaunchPoolBucketV2(this.context.umi, {
          genesisAccount,
          baseMint,
          baseTokenAllocation,
          depositStartCondition,
          depositEndCondition,
          claimStartCondition,
          claimEndCondition,
          authority: this.context.signer,
          payer: this.context.payer,
          bucketIndex,
        })

        result = await umiSendAndConfirmTransaction(this.context.umi, transaction)

        bucketPda = findLaunchPoolBucketV2Pda(this.context.umi, {
          genesisAccount,
          bucketIndex,
        })
      } else {
        // unlocked bucket
        const claimStartCondition = this.createTimeAbsoluteCondition(flags.claimStart)
        const claimEndCondition = this.createTimeAbsoluteCondition(flags.claimEnd)

        const recipient = flags.recipient
          ? publicKey(flags.recipient)
          : this.context.signer.publicKey

        const transaction = addUnlockedBucketV2(this.context.umi, {
          genesisAccount,
          baseMint,
          baseTokenAllocation,
          claimStartCondition,
          claimEndCondition,
          backendSigner: null,
          recipient,
          authority: this.context.signer,
          payer: this.context.payer,
          bucketIndex,
        })

        result = await umiSendAndConfirmTransaction(this.context.umi, transaction)

        bucketPda = findUnlockedBucketV2Pda(this.context.umi, {
          genesisAccount,
          bucketIndex,
        })
      }

      spinner.succeed('Bucket added successfully!')

      this.log('')
      this.logSuccess(`Bucket Type: ${flags.type}`)
      this.log(`Genesis Account: ${genesisAccount}`)
      this.log(`Bucket Address: ${bucketPda[0]}`)
      this.log(`Base Mint: ${baseMint}`)
      this.log(`Allocation: ${baseTokenAllocation.toString()}`)

      if (flags.type === 'launch-pool') {
        this.log(`Deposit Start: ${flags.depositStart}`)
        this.log(`Deposit End: ${flags.depositEnd}`)
        if (flags.claimStart) this.log(`Claim Start: ${flags.claimStart}`)
        if (flags.claimEnd) this.log(`Claim End: ${flags.claimEnd}`)
      } else {
        if (flags.claimStart) this.log(`Claim Start: ${flags.claimStart}`)
        if (flags.claimEnd) this.log(`Claim End: ${flags.claimEnd}`)
        this.log(`Recipient: ${flags.recipient || this.context.signer.publicKey}`)
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
      spinner.fail('Failed to add bucket')
      throw error
    }
  }
}
