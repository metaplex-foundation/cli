import {
  transitionV2,
  safeFetchGenesisAccountV2,
  findLaunchPoolBucketV2Pda,
  safeFetchLaunchPoolBucketV2,
} from '@metaplex-foundation/genesis'
import { findAssociatedTokenPda } from '@metaplex-foundation/mpl-toolbox'
import { publicKey, AccountMeta } from '@metaplex-foundation/umi'
import { Args, Flags } from '@oclif/core'
import ora from 'ora'

import { TransactionCommand } from '../../TransactionCommand.js'
import { generateExplorerUrl } from '../../explorers.js'
import { txSignatureToString } from '../../lib/util.js'
import umiSendAndConfirmTransaction from '../../lib/umi/sendAndConfirm.js'

export default class GenesisTransition extends TransactionCommand<typeof GenesisTransition> {
  static override description = `Execute end behaviors (transition) for a Genesis bucket.

This command triggers the end behaviors configured on a launch pool bucket,
such as sending quote tokens to another bucket after the deposit period ends.

Requirements:
- The Genesis account must be finalized
- The deposit period must have ended
- The bucket must have end behaviors configured`

  static override examples = [
    '$ mplx genesis transition GenesisAddress123... --bucketIndex 0',
    '$ mplx genesis transition GenesisAddress123... -b 1',
  ]

  static override usage = 'genesis transition [GENESIS] [FLAGS]'

  static override args = {
    genesis: Args.string({
      description: 'The Genesis account address',
      required: true,
    }),
  }

  static override flags = {
    bucketIndex: Flags.integer({
      char: 'b',
      description: 'Index of the primary bucket whose end behaviors to execute',
      required: true,
    }),
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(GenesisTransition)
    const spinner = ora('Processing transition...').start()

    try {
      const genesisAddress = publicKey(args.genesis)

      // Fetch the Genesis account
      spinner.text = 'Fetching Genesis account details...'
      const genesisAccount = await safeFetchGenesisAccountV2(this.context.umi, genesisAddress)

      if (!genesisAccount) {
        spinner.fail('Genesis account not found')
        this.error(`Genesis account not found at address: ${args.genesis}`)
      }

      // Find the primary bucket PDA
      const [primaryBucketPda] = findLaunchPoolBucketV2Pda(this.context.umi, {
        genesisAccount: genesisAddress,
        bucketIndex: flags.bucketIndex,
      })

      // Verify the bucket exists
      spinner.text = 'Verifying bucket...'
      const bucket = await safeFetchLaunchPoolBucketV2(this.context.umi, primaryBucketPda)

      if (!bucket) {
        spinner.fail('Bucket not found')
        this.error(`Launch pool bucket not found at index ${flags.bucketIndex}. Make sure the bucket has been created.`)
      }

      // Collect destination bucket pubkeys from end behaviors
      spinner.text = 'Resolving end behavior destinations...'
      const destinationBuckets = new Set<string>()
      for (const behavior of bucket.endBehaviors) {
        if ('destinationBucket' in behavior) {
          destinationBuckets.add(behavior.destinationBucket.toString())
        }
      }

      // Build remaining accounts: pairs of (bucket, quote_token_ata)
      const remainingAccounts: AccountMeta[] = []
      for (const destBucketStr of destinationBuckets) {
        const destBucket = publicKey(destBucketStr)
        const [quoteTokenAta] = findAssociatedTokenPda(this.context.umi, {
          mint: genesisAccount.quoteMint,
          owner: destBucket,
        })
        remainingAccounts.push(
          { pubkey: destBucket, isSigner: false, isWritable: true },
          { pubkey: quoteTokenAta, isSigner: false, isWritable: true },
        )
      }

      // Build the transition transaction
      spinner.text = 'Executing transition...'
      const transaction = transitionV2(this.context.umi, {
        genesisAccount: genesisAddress,
        primaryBucket: primaryBucketPda,
        baseMint: genesisAccount.baseMint,
        quoteMint: genesisAccount.quoteMint,
        payer: this.context.payer,
      }).addRemainingAccounts(remainingAccounts)

      const result = await umiSendAndConfirmTransaction(this.context.umi, transaction)

      spinner.succeed('Transition executed successfully!')

      this.log('')
      this.logSuccess(`Transition completed for bucket index ${flags.bucketIndex}`)
      this.log('')
      this.log('Transition Details:')
      this.log(`  Genesis Account: ${genesisAddress}`)
      this.log(`  Primary Bucket: ${primaryBucketPda}`)
      this.log(`  Bucket Index: ${flags.bucketIndex}`)
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
      spinner.fail('Failed to execute transition')
      throw error
    }
  }
}
