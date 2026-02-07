import {
  addUnlockedBucketV2,
  safeFetchGenesisAccountV2,
  findUnlockedBucketV2Pda,
} from '@metaplex-foundation/genesis'
import { publicKey, none } from '@metaplex-foundation/umi'
import { Args, Flags } from '@oclif/core'
import ora from 'ora'

import { TransactionCommand } from '../../../TransactionCommand.js'
import { generateExplorerUrl } from '../../../explorers.js'
import { txSignatureToString } from '../../../lib/util.js'
import umiSendAndConfirmTransaction from '../../../lib/umi/sendAndConfirm.js'

export default class AddUnlocked extends TransactionCommand<typeof AddUnlocked> {
  static override description = `Add an unlocked (treasury) bucket to a Genesis account.

Unlocked buckets are used for team/treasury allocations that can be claimed
by a designated recipient after the claim period starts.

Unlike launch pools or presales, unlocked buckets don't accept deposits.
Instead, they allocate base tokens directly to a recipient.`

  static override examples = [
    '$ mplx genesis bucket add-unlocked GenesisAddress... --recipient RecipientAddress... --claimStart 1704153600',
    '$ mplx genesis bucket add-unlocked GenesisAddress... --recipient RecipientAddress... --claimStart 1704153600 --allocation 100000000',
    '$ mplx genesis bucket add-unlocked GenesisAddress... --recipient RecipientAddress... --claimStart 1704153600 --claimEnd 1704240000',
  ]

  static override usage = 'genesis bucket add-unlocked [GENESIS] [FLAGS]'

  static override args = {
    genesis: Args.string({
      description: 'The Genesis account address',
      required: true,
    }),
  }

  static override flags = {
    recipient: Flags.string({
      description: 'Recipient address who can claim the unlocked tokens',
      required: true,
    }),
    claimStart: Flags.string({
      description: 'Unix timestamp when claims start',
      required: true,
    }),
    claimEnd: Flags.string({
      description: 'Unix timestamp when claims end (default: far future)',
      required: false,
    }),
    allocation: Flags.string({
      char: 'a',
      description: 'Base token allocation for this bucket (in base units, default: 0)',
      default: '0',
    }),
    bucketIndex: Flags.integer({
      char: 'b',
      description: 'Bucket index (default: auto-increment based on genesis bucket count)',
      required: false,
    }),
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(AddUnlocked)
    const spinner = ora('Adding unlocked bucket...').start()

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
      const claimStart = BigInt(flags.claimStart)
      // Default to far future (year 2100) if not specified
      const claimEnd = flags.claimEnd ? BigInt(flags.claimEnd) : BigInt('4102444800')

      // Parse allocation
      const allocation = BigInt(flags.allocation)

      // Build conditions (padding must be 47 bytes as required by the Genesis program)
      const conditionPadding = new Array(47).fill(0)

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

      // Build the add unlocked bucket transaction
      spinner.text = 'Adding unlocked bucket...'
      const transaction = addUnlockedBucketV2(this.context.umi, {
        genesisAccount: genesisAddress,
        baseMint: genesisAccount.baseMint,
        quoteMint: genesisAccount.quoteMint,
        authority: this.context.signer,
        payer: this.context.payer,
        recipient: publicKey(flags.recipient),
        bucketIndex,
        baseTokenAllocation: allocation,
        claimStartCondition,
        claimEndCondition,
        backendSigner: none(),
      })

      const result = await umiSendAndConfirmTransaction(this.context.umi, transaction)

      // Get the bucket PDA
      const [bucketPda] = findUnlockedBucketV2Pda(this.context.umi, {
        genesisAccount: genesisAddress,
        bucketIndex,
      })

      spinner.succeed('Unlocked bucket added successfully!')

      this.log('')
      this.logSuccess(`Unlocked Bucket Added`)
      this.log('')
      this.log('Bucket Details:')
      this.log(`  Genesis Account: ${genesisAddress}`)
      this.log(`  Bucket Address: ${bucketPda}`)
      this.log(`  Bucket Index: ${bucketIndex}`)
      this.log(`  Token Allocation: ${flags.allocation}`)
      this.log(`  Recipient: ${flags.recipient}`)
      this.log('')
      this.log('Schedule:')
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
      spinner.fail('Failed to add unlocked bucket')
      throw error
    }
  }
}
