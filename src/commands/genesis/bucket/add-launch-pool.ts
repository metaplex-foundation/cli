import {
  addLaunchPoolBucketV2,
  setLaunchPoolBucketV2Behaviors,
  safeFetchGenesisAccountV2,
  findLaunchPoolBucketV2Pda,
  createClaimSchedule,
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
    '$ mplx genesis bucket add-launch-pool GenesisAddress... --allocation 500000000 --depositStart 1704067200 --depositEnd 1704153600 --claimStart 1704153600 --claimEnd 1704240000',
    '$ mplx genesis bucket add-launch-pool GenesisAddress... --allocation 1000000000 --depositStart 1704067200 --depositEnd 1704153600 --claimStart 1704153600 --claimEnd 1704240000 --endBehavior "<BUCKET_ADDRESS>:10000"',
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
      description: 'Unix timestamp when claims end',
      required: true,
    }),
    bucketIndex: Flags.integer({
      char: 'b',
      description: 'Bucket index (default: 0)',
      required: false,
    }),
    endBehavior: Flags.string({
      description: 'End behavior in format <destinationBucketAddress>:<percentageBps> (can specify multiple)',
      multiple: true,
      required: false,
    }),
    minimumDeposit: Flags.string({
      description: 'Minimum deposit amount per transaction (in base units)',
      required: false,
    }),
    depositLimit: Flags.string({
      description: 'Maximum deposit limit per user (in base units)',
      required: false,
    }),
    minimumQuoteTokenThreshold: Flags.string({
      description: 'Minimum total quote tokens required for the bucket to succeed',
      required: false,
    }),
    depositPenalty: Flags.string({
      description: 'Deposit penalty schedule as JSON: {"slopeBps":0,"interceptBps":200,"maxBps":200,"startTime":0,"endTime":0}',
      required: false,
    }),
    withdrawPenalty: Flags.string({
      description: 'Withdraw penalty schedule as JSON: {"slopeBps":0,"interceptBps":200,"maxBps":200,"startTime":0,"endTime":0}',
      required: false,
    }),
    bonusSchedule: Flags.string({
      description: 'Bonus schedule as JSON: {"slopeBps":0,"interceptBps":0,"maxBps":0,"startTime":0,"endTime":0}',
      required: false,
    }),
    claimSchedule: Flags.string({
      description: 'Claim vesting schedule as JSON: {"startTime":0,"endTime":0,"period":0,"cliffTime":0,"cliffAmountBps":0}',
      required: false,
    }),
    allowlist: Flags.string({
      description: 'Allowlist config as JSON: {"merkleTreeHeight":10,"merkleRoot":"<hex>","endTime":0,"quoteCap":0}',
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

      const bucketIndex = flags.bucketIndex ?? 0

      // Parse timestamps
      const depositStart = BigInt(flags.depositStart)
      const depositEnd = BigInt(flags.depositEnd)
      const claimStart = BigInt(flags.claimStart)
      const claimEnd = BigInt(flags.claimEnd)

      // Parse allocation
      const allocation = BigInt(flags.allocation)

      // Build conditions (padding must be 47 bytes as required by the Genesis program)
      const conditionPadding = new Array(47).fill(0)

      const depositStartCondition = {
        __kind: 'TimeAbsolute' as const,
        padding: conditionPadding,
        time: depositStart,
        triggeredTimestamp: BigInt(0),
      }

      const depositEndCondition = {
        __kind: 'TimeAbsolute' as const,
        padding: conditionPadding,
        time: depositEnd,
        triggeredTimestamp: BigInt(0),
      }

      const claimStartCondition = {
        __kind: 'TimeAbsolute' as const,
        padding: conditionPadding,
        time: claimStart,
        triggeredTimestamp: BigInt(0),
      }

      const claimEndCondition = {
        __kind: 'TimeAbsolute' as const,
        padding: conditionPadding,
        time: claimEnd,
        triggeredTimestamp: BigInt(0),
      }

      // Parse end behaviors
      const endBehaviors = (flags.endBehavior ?? []).map((behavior: string) => {
        const [destinationBucketAddr, percentageBpsStr] = behavior.split(':')
        if (!destinationBucketAddr || !percentageBpsStr) {
          throw new Error(`Invalid end behavior format: "${behavior}". Expected format: <destinationBucketAddress>:<percentageBps>`)
        }
        return {
          __kind: 'SendQuoteTokenPercentage' as const,
          processed: false,
          percentageBps: Number(percentageBpsStr),
          padding: new Array(4).fill(0),
          destinationBucket: publicKey(destinationBucketAddr),
        }
      })

      // Parse optional LinearBpsSchedule fields
      const parseLinearBpsSchedule = (json: string) => {
        const parsed = JSON.parse(json)
        return {
          slopeBps: BigInt(parsed.slopeBps),
          interceptBps: BigInt(parsed.interceptBps),
          maxBps: BigInt(parsed.maxBps),
          startTime: BigInt(parsed.startTime),
          endTime: BigInt(parsed.endTime),
        }
      }

      // Parse optional ClaimSchedule
      const parseClaimSchedule = (json: string) => {
        const parsed = JSON.parse(json)
        return createClaimSchedule({
          startTime: BigInt(parsed.startTime),
          endTime: BigInt(parsed.endTime),
          period: BigInt(parsed.period),
          cliffTime: BigInt(parsed.cliffTime),
          cliffAmountBps: Number(parsed.cliffAmountBps),
        })
      }

      // Parse optional Allowlist
      const parseAllowlist = (json: string) => {
        const parsed = JSON.parse(json)
        return {
          enabled: true,
          merkleTreeHeight: Number(parsed.merkleTreeHeight),
          padding: new Array(3).fill(0),
          merkleRoot: Uint8Array.from(Buffer.from(parsed.merkleRoot, 'hex')),
          endTime: BigInt(parsed.endTime),
          quoteCap: BigInt(parsed.quoteCap),
        }
      }

      // Build the add bucket transaction (without endBehaviors to stay within tx size limit)
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
        depositPenalty: flags.depositPenalty
          ? some(parseLinearBpsSchedule(flags.depositPenalty))
          : none(),
        withdrawPenalty: flags.withdrawPenalty
          ? some(parseLinearBpsSchedule(flags.withdrawPenalty))
          : none(),
        bonusSchedule: flags.bonusSchedule
          ? some(parseLinearBpsSchedule(flags.bonusSchedule))
          : none(),
        depositLimit: flags.depositLimit
          ? some({ limit: BigInt(flags.depositLimit) })
          : none(),
        allowlist: flags.allowlist
          ? some(parseAllowlist(flags.allowlist))
          : none(),
        claimSchedule: flags.claimSchedule
          ? some(parseClaimSchedule(flags.claimSchedule))
          : none(),
        minimumDepositAmount: flags.minimumDeposit
          ? some({ amount: BigInt(flags.minimumDeposit) })
          : none(),
        minimumQuoteTokenThreshold: flags.minimumQuoteTokenThreshold
          ? some({ amount: BigInt(flags.minimumQuoteTokenThreshold) })
          : none(),
        endBehaviors: [],
      })

      // Compute bucket PDA once for reuse
      const [bucketPda] = findLaunchPoolBucketV2Pda(this.context.umi, {
        genesisAccount: genesisAddress,
        bucketIndex,
      })

      const result = await umiSendAndConfirmTransaction(this.context.umi, transaction)

      // Set end behaviors in a separate transaction if provided
      let behaviorsSignature: string | undefined
      let behaviorsError: unknown
      if (endBehaviors.length > 0) {
        try {
          spinner.text = 'Setting end behaviors...'
          const setBehaviorsTx = setLaunchPoolBucketV2Behaviors(this.context.umi, {
            genesisAccount: genesisAddress,
            bucket: bucketPda,
            authority: this.context.signer,
            payer: this.context.payer,
            padding: new Array(3).fill(0),
            endBehaviors,
          })

          const behaviorsResult = await umiSendAndConfirmTransaction(this.context.umi, setBehaviorsTx)
          behaviorsSignature = txSignatureToString(behaviorsResult.transaction.signature as Uint8Array)
        } catch (error) {
          behaviorsError = error
        }
      }

      if (behaviorsError) {
        spinner.warn('Bucket created but failed to set end behaviors')
        this.warn(
          `End behaviors were not set. Run setLaunchPoolBucketV2Behaviors manually for bucket ${bucketPda}.\n` +
          `Error: ${behaviorsError instanceof Error ? behaviorsError.message : String(behaviorsError)}`
        )
      } else {
        spinner.succeed('Launch pool bucket added successfully!')
      }

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
      this.log(`  Claim End: ${new Date(Number(claimEnd) * 1000).toISOString()}`)
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
      if (behaviorsSignature) {
        this.log('')
        this.log(`Behaviors Transaction: ${behaviorsSignature}`)
        this.log(
          generateExplorerUrl(
            this.context.explorer,
            this.context.chain,
            behaviorsSignature,
            'transaction'
          )
        )
      }

    } catch (error) {
      spinner.fail('Failed to add launch pool bucket')
      throw error
    }
  }
}
