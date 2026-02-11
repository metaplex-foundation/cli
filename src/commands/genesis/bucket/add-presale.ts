import {
  addPresaleBucketV2,
  safeFetchGenesisAccountV2,
  findPresaleBucketV2Pda,
} from '@metaplex-foundation/genesis'
import { publicKey, some, none } from '@metaplex-foundation/umi'
import { Args, Flags } from '@oclif/core'
import ora from 'ora'

import { TransactionCommand } from '../../../TransactionCommand.js'
import { generateExplorerUrl } from '../../../explorers.js'
import { txSignatureToString } from '../../../lib/util.js'
import umiSendAndConfirmTransaction from '../../../lib/umi/sendAndConfirm.js'

export default class AddPresale extends TransactionCommand<typeof AddPresale> {
  static override description = `Add a presale bucket to a Genesis account.

Presale buckets offer fixed-price token allocations where:
- Price is determined by quoteCap / allocation
- Deposits are accepted during the deposit period
- Claims are available after the claim period starts

The bucket requires start/end conditions for deposits and claims.
Use Unix timestamps for absolute times.`

  static override examples = [
    '$ mplx genesis bucket add-presale GenesisAddress... --allocation 500000000 --quoteCap 1000000000 --depositStart 1704067200 --depositEnd 1704153600 --claimStart 1704153600',
    '$ mplx genesis bucket add-presale GenesisAddress... --allocation 1000000000 --quoteCap 5000000000 --depositStart 1704067200 --depositEnd 1704153600 --claimStart 1704153600 --claimEnd 1704240000',
  ]

  static override usage = 'genesis bucket add-presale [GENESIS] [FLAGS]'

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
    quoteCap: Flags.string({
      description: 'Quote token cap (total quote tokens accepted; price = quoteCap / allocation)',
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
      description: 'Unix timestamp when claims end (optional, defaults to far future)',
      required: false,
    }),
    bucketIndex: Flags.integer({
      char: 'b',
      description: 'Bucket index for this presale bucket',
      required: true,
    }),
    minimumDeposit: Flags.string({
      description: 'Minimum deposit amount per transaction (in quote token base units)',
      required: false,
    }),
    depositLimit: Flags.string({
      description: 'Maximum deposit limit per user (in quote token base units)',
      required: false,
    }),
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(AddPresale)
    const spinner = ora('Adding presale bucket...').start()

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

      // Determine bucket index (bucketCount deserialization is unreliable, so require explicit index or default to 0)
      const bucketIndex = flags.bucketIndex ?? 0

      // Parse timestamps
      const depositStart = BigInt(flags.depositStart)
      const depositEnd = BigInt(flags.depositEnd)
      const claimStart = BigInt(flags.claimStart)
      // Default to far future (year 2100) if not specified
      const claimEnd = flags.claimEnd ? BigInt(flags.claimEnd) : BigInt('4102444800')

      // Parse allocation and quote cap
      const allocation = BigInt(flags.allocation)
      const quoteCap = BigInt(flags.quoteCap)

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

      // Build the add presale bucket transaction
      spinner.text = 'Adding presale bucket...'
      const transaction = addPresaleBucketV2(this.context.umi, {
        genesisAccount: genesisAddress,
        baseMint: genesisAccount.baseMint,
        quoteMint: genesisAccount.quoteMint,
        authority: this.context.signer,
        payer: this.context.payer,
        bucketIndex,
        baseTokenAllocation: allocation,
        allocationQuoteTokenCap: quoteCap,
        depositStartCondition,
        depositEndCondition,
        claimStartCondition,
        claimEndCondition,
        backendSigner: none(),
        depositLimit: flags.depositLimit
          ? some({ limit: BigInt(flags.depositLimit) })
          : none(),
        allowlist: none(),
        claimSchedule: none(),
        minimumDepositAmount: flags.minimumDeposit
          ? some({ amount: BigInt(flags.minimumDeposit) })
          : none(),
        endBehaviors: [],
        depositCooldown: none(),
        perCooldownDepositLimit: none(),
        steppedDepositLimit: none(),
      })

      const result = await umiSendAndConfirmTransaction(this.context.umi, transaction)

      // Get the bucket PDA
      const [bucketPda] = findPresaleBucketV2Pda(this.context.umi, {
        genesisAccount: genesisAddress,
        bucketIndex,
      })

      spinner.succeed('Presale bucket added successfully!')

      this.log('')
      this.logSuccess(`Presale Bucket Added`)
      this.log('')
      this.log('Bucket Details:')
      this.log(`  Genesis Account: ${genesisAddress}`)
      this.log(`  Bucket Address: ${bucketPda}`)
      this.log(`  Bucket Index: ${bucketIndex}`)
      this.log(`  Token Allocation: ${flags.allocation}`)
      this.log(`  Quote Token Cap: ${flags.quoteCap}`)
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

    } catch (error) {
      spinner.fail('Failed to add presale bucket')
      throw error
    }
  }
}
