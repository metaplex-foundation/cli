import {
  depositLaunchPoolV2,
  safeFetchGenesisAccountV2,
  findLaunchPoolBucketV2Pda,
  findLaunchPoolDepositV2Pda,
  safeFetchLaunchPoolBucketV2,
} from '@metaplex-foundation/genesis'
import { publicKey } from '@metaplex-foundation/umi'
import { Args, Flags } from '@oclif/core'
import ora from 'ora'

import { TransactionCommand } from '../../TransactionCommand.js'
import { generateExplorerUrl } from '../../explorers.js'
import { txSignatureToString } from '../../lib/util.js'
import umiSendAndConfirmTransaction from '../../lib/umi/sendAndConfirm.js'

export default class GenesisDeposit extends TransactionCommand<typeof GenesisDeposit> {
  static override description = `Deposit into a Genesis launch pool.

This command deposits quote tokens (e.g., SOL, USDC) into a launch pool bucket.
You will receive a proportional allocation of tokens based on your share of contributions.

Launch pools use a pro-rata allocation model where:
- Everyone gets the same price
- Allocation is based on your contribution relative to total contributions
- No frontrunning or sniping possible`

  static override examples = [
    '$ mplx genesis deposit GenesisAddress123... --amount 1000000000 --bucketIndex 0',
    '$ mplx genesis deposit GenesisAddress123... --amount 1000000000',
    '$ mplx genesis deposit GenesisAddress123... --amount 5000000000 --bucketIndex 1',
  ]

  static override usage = 'genesis deposit [GENESIS] [FLAGS]'

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
      description: 'Index of the launch pool bucket (default: 0)',
      default: 0,
    }),
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(GenesisDeposit)
    const spinner = ora('Processing deposit...').start()

    try {
      const genesisAddress = publicKey(args.genesis)

      // Fetch the Genesis account
      spinner.text = 'Fetching Genesis account details...'
      const genesisAccount = await safeFetchGenesisAccountV2(this.context.umi, genesisAddress)

      if (!genesisAccount) {
        spinner.fail('Genesis account not found')
        this.error(`Genesis account not found at address: ${args.genesis}`)
      }

      // Find the launch pool bucket PDA
      const [bucketPda] = findLaunchPoolBucketV2Pda(this.context.umi, {
        genesisAccount: genesisAddress,
        bucketIndex: flags.bucketIndex,
      })

      // Verify the bucket exists
      spinner.text = 'Verifying launch pool bucket...'
      const bucket = await safeFetchLaunchPoolBucketV2(this.context.umi, bucketPda)

      if (!bucket) {
        spinner.fail('Launch pool bucket not found')
        this.error(`Launch pool bucket not found at index ${flags.bucketIndex}. Make sure the bucket has been created.`)
      }

      // Parse and validate amount
      let amount: bigint
      try {
        amount = BigInt(flags.amount)
      } catch {
        this.error(`Invalid amount "${flags.amount}". Must be a non-negative integer.`)
      }

      if (amount <= 0n) {
        this.error('Deposit amount must be greater than 0.')
      }

      // Build the deposit transaction
      spinner.text = 'Depositing into launch pool...'
      const transaction = depositLaunchPoolV2(this.context.umi, {
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

      // Find the deposit PDA for reference
      const depositPda = findLaunchPoolDepositV2Pda(this.context.umi, {
        bucket: bucketPda,
        recipient: this.context.signer.publicKey,
      })

      spinner.succeed('Deposit successful!')

      this.log('')
      this.logSuccess(`Deposited ${flags.amount} quote tokens`)
      this.log('')
      this.log('Deposit Details:')
      this.log(`  Genesis Account: ${genesisAddress}`)
      this.log(`  Bucket: ${bucketPda}`)
      this.log(`  Bucket Index: ${flags.bucketIndex}`)
      this.log(`  Deposit PDA: ${depositPda}`)
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
      this.log('Note: Your token allocation will be calculated pro-rata based on total contributions.')
      this.log('Use "mplx genesis claim" to claim your tokens after the launch is finalized.')

    } catch (error) {
      spinner.fail('Failed to deposit')
      throw error
    }
  }
}
