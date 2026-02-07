import {
  depositPresaleV2,
  safeFetchGenesisAccountV2,
  findPresaleBucketV2Pda,
  safeFetchPresaleBucketV2,
} from '@metaplex-foundation/genesis'
import { publicKey } from '@metaplex-foundation/umi'
import { Args, Flags } from '@oclif/core'
import ora from 'ora'

import { TransactionCommand } from '../../../TransactionCommand.js'
import { generateExplorerUrl } from '../../../explorers.js'
import { txSignatureToString } from '../../../lib/util.js'
import umiSendAndConfirmTransaction from '../../../lib/umi/sendAndConfirm.js'

export default class PresaleDeposit extends TransactionCommand<typeof PresaleDeposit> {
  static override description = `Deposit into a Genesis presale bucket.

This command deposits quote tokens (e.g., SOL, USDC) into a presale bucket.
Presale buckets offer fixed-price allocations with a set quote token cap.

Requirements:
- The deposit period must be active
- The presale bucket must exist`

  static override examples = [
    '$ mplx genesis presale deposit GenesisAddress123... --amount 1000000000 --bucketIndex 0',
    '$ mplx genesis presale deposit GenesisAddress123... --amount 500000000',
  ]

  static override usage = 'genesis presale deposit [GENESIS] [FLAGS]'

  static override args = {
    genesis: Args.string({
      description: 'The Genesis account address',
      required: true,
    }),
  }

  static override flags = {
    amount: Flags.string({
      char: 'a',
      description: 'Amount of quote tokens to deposit (in base units, e.g., lamports for SOL)',
      required: true,
    }),
    bucketIndex: Flags.integer({
      char: 'b',
      description: 'Index of the presale bucket (default: 0)',
      default: 0,
    }),
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(PresaleDeposit)
    const spinner = ora('Processing presale deposit...').start()

    try {
      const genesisAddress = publicKey(args.genesis)

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
        this.error(`Presale bucket not found at index ${flags.bucketIndex}. Make sure the bucket has been created.`)
      }

      // Parse amount
      const amount = BigInt(flags.amount)

      // Build the deposit transaction
      spinner.text = 'Depositing into presale...'
      const transaction = depositPresaleV2(this.context.umi, {
        genesisAccount: genesisAddress,
        bucket: bucketPda,
        baseMint: genesisAccount.baseMint,
        quoteMint: genesisAccount.quoteMint,
        depositor: this.context.signer,
        recipient: this.context.signer,
        rentPayer: this.context.payer,
        amountQuoteToken: amount,
      })

      const result = await umiSendAndConfirmTransaction(this.context.umi, transaction)

      spinner.succeed('Presale deposit successful!')

      this.log('')
      this.logSuccess(`Deposited ${flags.amount} quote tokens into presale`)
      this.log('')
      this.log('Deposit Details:')
      this.log(`  Genesis Account: ${genesisAddress}`)
      this.log(`  Bucket: ${bucketPda}`)
      this.log(`  Bucket Index: ${flags.bucketIndex}`)
      this.log(`  Amount: ${flags.amount}`)
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
      this.log('')
      this.log('Use "mplx genesis presale claim" to claim your tokens after the claim period starts.')

    } catch (error) {
      spinner.fail('Failed to deposit into presale')
      throw error
    }
  }
}
