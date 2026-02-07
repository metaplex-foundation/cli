import {
  claimUnlockedV2,
  safeFetchGenesisAccountV2,
  findUnlockedBucketV2Pda,
  safeFetchUnlockedBucketV2,
} from '@metaplex-foundation/genesis'
import { publicKey } from '@metaplex-foundation/umi'
import { Args, Flags } from '@oclif/core'
import ora from 'ora'

import { TransactionCommand } from '../../TransactionCommand.js'
import { generateExplorerUrl } from '../../explorers.js'
import { txSignatureToString } from '../../lib/util.js'
import umiSendAndConfirmTransaction from '../../lib/umi/sendAndConfirm.js'

export default class GenesisClaimUnlocked extends TransactionCommand<typeof GenesisClaimUnlocked> {
  static override description = `Claim tokens from a Genesis unlocked (treasury) bucket.

This command claims tokens from an unlocked bucket, which is typically used
for treasury or team allocations that vest over time.

Requirements:
- The Genesis account must be finalized
- The claim period must be active
- You must be the designated recipient of the unlocked bucket`

  static override examples = [
    '$ mplx genesis claim-unlocked GenesisAddress123... --bucketIndex 0',
    '$ mplx genesis claim-unlocked GenesisAddress123... -b 1',
    '$ mplx genesis claim-unlocked GenesisAddress123... --bucketIndex 0 --recipient RecipientAddress...',
  ]

  static override usage = 'genesis claim-unlocked [GENESIS] [FLAGS]'

  static override args = {
    genesis: Args.string({
      description: 'The Genesis account address',
      required: true,
    }),
  }

  static override flags = {
    bucketIndex: Flags.integer({
      char: 'b',
      description: 'Index of the unlocked bucket (default: 0)',
      default: 0,
    }),
    recipient: Flags.string({
      description: 'Recipient address for claimed tokens (default: signer)',
      required: false,
    }),
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(GenesisClaimUnlocked)
    const spinner = ora('Processing claim...').start()

    try {
      const genesisAddress = publicKey(args.genesis)
      const recipientAddress = flags.recipient
        ? publicKey(flags.recipient)
        : this.context.signer.publicKey

      // Fetch the Genesis account
      spinner.text = 'Fetching Genesis account details...'
      const genesisAccount = await safeFetchGenesisAccountV2(this.context.umi, genesisAddress)

      if (!genesisAccount) {
        spinner.fail('Genesis account not found')
        this.error(`Genesis account not found at address: ${args.genesis}`)
      }

      // Find the unlocked bucket PDA
      const [bucketPda] = findUnlockedBucketV2Pda(this.context.umi, {
        genesisAccount: genesisAddress,
        bucketIndex: flags.bucketIndex,
      })

      // Verify the bucket exists
      spinner.text = 'Verifying unlocked bucket...'
      const bucket = await safeFetchUnlockedBucketV2(this.context.umi, bucketPda)

      if (!bucket) {
        spinner.fail('Unlocked bucket not found')
        this.error(`Unlocked bucket not found at index ${flags.bucketIndex}. Make sure the bucket has been created.`)
      }

      // Build the claim transaction
      spinner.text = 'Claiming tokens from unlocked bucket...'
      const transaction = claimUnlockedV2(this.context.umi, {
        genesisAccount: genesisAddress,
        bucket: bucketPda,
        baseMint: genesisAccount.baseMint,
        quoteMint: genesisAccount.quoteMint,
        recipient: recipientAddress,
        payer: this.context.payer,
      })

      const result = await umiSendAndConfirmTransaction(this.context.umi, transaction)

      spinner.succeed('Tokens claimed successfully!')

      this.log('')
      this.logSuccess(`Claimed tokens from unlocked bucket`)
      this.log('')
      this.log('Claim Details:')
      this.log(`  Genesis Account: ${genesisAddress}`)
      this.log(`  Bucket: ${bucketPda}`)
      this.log(`  Bucket Index: ${flags.bucketIndex}`)
      this.log(`  Recipient: ${recipientAddress}`)
      this.log(`  Base Mint: ${genesisAccount.baseMint}`)
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
      spinner.fail('Failed to claim tokens')
      throw error
    }
  }
}
