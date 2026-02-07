import {
  withdrawLaunchPoolV2,
  safeFetchGenesisAccountV2,
  findLaunchPoolBucketV2Pda,
  findLaunchPoolDepositV2Pda,
  safeFetchLaunchPoolBucketV2,
  safeFetchLaunchPoolDepositV2,
} from '@metaplex-foundation/genesis'
import { publicKey } from '@metaplex-foundation/umi'
import { Args, Flags } from '@oclif/core'
import ora from 'ora'

import { TransactionCommand } from '../../TransactionCommand.js'
import { generateExplorerUrl } from '../../explorers.js'
import { txSignatureToString } from '../../lib/util.js'
import umiSendAndConfirmTransaction from '../../lib/umi/sendAndConfirm.js'

export default class GenesisWithdraw extends TransactionCommand<typeof GenesisWithdraw> {
  static override description = `Withdraw from a Genesis launch pool.

This command withdraws quote tokens from a launch pool bucket.
You can only withdraw tokens you have previously deposited.

Requirements:
- The deposit period must still be active
- You must have an existing deposit in the launch pool`

  static override examples = [
    '$ mplx genesis withdraw GenesisAddress123... --amount 1000000000 --bucketIndex 0',
    '$ mplx genesis withdraw GenesisAddress123... --amount 500000000',
  ]

  static override usage = 'genesis withdraw [GENESIS] [FLAGS]'

  static override args = {
    genesis: Args.string({
      description: 'The Genesis account address',
      required: true,
    }),
  }

  static override flags = {
    amount: Flags.string({
      char: 'a',
      description: 'Amount of quote tokens to withdraw (in base units, e.g., lamports for SOL)',
      required: true,
    }),
    bucketIndex: Flags.integer({
      char: 'b',
      description: 'Index of the launch pool bucket (default: 0)',
      default: 0,
    }),
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(GenesisWithdraw)
    const spinner = ora('Processing withdrawal...').start()

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

      // Verify the deposit exists
      const [depositPda] = findLaunchPoolDepositV2Pda(this.context.umi, {
        bucket: bucketPda,
        recipient: this.context.signer.publicKey,
      })

      spinner.text = 'Verifying deposit...'
      const deposit = await safeFetchLaunchPoolDepositV2(this.context.umi, depositPda)

      if (!deposit) {
        spinner.fail('Deposit not found')
        this.error(`No deposit found for signer ${this.context.signer.publicKey}. Make sure you have deposited into this launch pool.`)
      }

      // Parse and validate amount
      let amount: bigint
      try {
        amount = BigInt(flags.amount)
      } catch {
        this.error(`Invalid amount "${flags.amount}". Must be a non-negative integer.`)
      }

      if (amount <= 0n) {
        this.error('Withdrawal amount must be greater than 0.')
      }

      // Build the withdraw transaction
      spinner.text = 'Withdrawing from launch pool...'
      const transaction = withdrawLaunchPoolV2(this.context.umi, {
        genesisAccount: genesisAddress,
        bucket: bucketPda,
        baseMint: genesisAccount.baseMint,
        quoteMint: genesisAccount.quoteMint,
        withdrawer: this.context.signer,
        payer: this.context.payer,
        amountQuoteToken: amount,
      })

      const result = await umiSendAndConfirmTransaction(this.context.umi, transaction)

      spinner.succeed('Withdrawal successful!')

      this.log('')
      this.logSuccess(`Withdrew ${flags.amount} quote tokens`)
      this.log('')
      this.log('Withdrawal Details:')
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

    } catch (error) {
      spinner.fail('Failed to withdraw')
      throw error
    }
  }
}
