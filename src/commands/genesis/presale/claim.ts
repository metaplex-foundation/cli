import {
  claimPresaleV2,
  safeFetchGenesisAccountV2,
  findPresaleBucketV2Pda,
  findPresaleDepositV2Pda,
  safeFetchPresaleBucketV2,
  safeFetchPresaleDepositV2,
} from '@metaplex-foundation/genesis'
import { publicKey } from '@metaplex-foundation/umi'
import { Args, Flags } from '@oclif/core'
import ora from 'ora'

import { TransactionCommand } from '../../../TransactionCommand.js'
import { generateExplorerUrl } from '../../../explorers.js'
import { txSignatureToString } from '../../../lib/util.js'
import umiSendAndConfirmTransaction from '../../../lib/umi/sendAndConfirm.js'

export default class PresaleClaim extends TransactionCommand<typeof PresaleClaim> {
  static override description = `Claim tokens from a Genesis presale bucket.

This command claims your allocated tokens from a presale bucket.
Your allocation is based on your deposit amount and the presale price.

Requirements:
- The Genesis launch must be finalized
- You must have an existing deposit in the presale bucket
- The claim period must be active`

  static override examples = [
    '$ mplx genesis presale claim GenesisAddress123... --bucketIndex 0',
    '$ mplx genesis presale claim GenesisAddress123...',
    '$ mplx genesis presale claim GenesisAddress123... --bucketIndex 1 --recipient RecipientAddress...',
  ]

  static override usage = 'genesis presale claim [GENESIS] [FLAGS]'

  static override args = {
    genesis: Args.string({
      description: 'The Genesis account address',
      required: true,
    }),
  }

  static override flags = {
    bucketIndex: Flags.integer({
      char: 'b',
      description: 'Index of the presale bucket (default: 0)',
      default: 0,
    }),
    recipient: Flags.string({
      description: 'Recipient address for claimed tokens (default: signer)',
      required: false,
    }),
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(PresaleClaim)
    const spinner = ora('Processing presale claim...').start()

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

      // Find the presale bucket PDA
      const [bucketPda] = findPresaleBucketV2Pda(this.context.umi, {
        genesisAccount: genesisAddress,
        bucketIndex: flags.bucketIndex,
      })

      // Verify the bucket exists
      spinner.text = 'Verifying presale bucket...'
      const bucket = await safeFetchPresaleBucketV2(this.context.umi, bucketPda)

      if (!bucket) {
        spinner.fail('Presale bucket not found')
        this.error(`Presale bucket not found at index ${flags.bucketIndex}`)
      }

      // Find and verify the deposit PDA
      const depositPda = findPresaleDepositV2Pda(this.context.umi, {
        bucket: bucketPda,
        recipient: recipientAddress,
      })

      spinner.text = 'Verifying deposit...'
      const deposit = await safeFetchPresaleDepositV2(this.context.umi, depositPda)

      if (!deposit) {
        spinner.fail('Deposit not found')
        this.error(`No presale deposit found for recipient ${recipientAddress}. Make sure you have deposited into this presale bucket.`)
      }

      // Build the claim transaction
      spinner.text = 'Claiming presale tokens...'
      const transaction = claimPresaleV2(this.context.umi, {
        genesisAccount: genesisAddress,
        bucket: bucketPda,
        baseMint: genesisAccount.baseMint,
        quoteMint: genesisAccount.quoteMint,
        depositPda,
        recipient: recipientAddress,
        payer: this.context.payer,
      })

      const result = await umiSendAndConfirmTransaction(this.context.umi, transaction)

      spinner.succeed('Presale tokens claimed successfully!')

      this.log('')
      this.logSuccess(`Claimed tokens from presale bucket`)
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
      spinner.fail('Failed to claim presale tokens')
      throw error
    }
  }
}
