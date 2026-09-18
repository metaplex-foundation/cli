import {
  findLaunchPoolBucketV2Pda,
  findLaunchPoolDepositV2Pda,
  refundLaunchPoolV2,
  safeFetchGenesisAccountV2,
  safeFetchLaunchPoolBucketV2,
  safeFetchLaunchPoolDepositV2,
} from '@metaplex-foundation/genesis'
import { publicKey, unwrapOption } from '@metaplex-foundation/umi'
import { Args, Flags } from '@oclif/core'
import ora from 'ora'

import { TransactionCommand } from '../../TransactionCommand.js'
import { generateExplorerUrl } from '../../explorers.js'
import { txSignatureToString } from '../../lib/util.js'
import { computeExcessRefund } from '../../lib/genesis/softCap.js'
import umiSendAndConfirmTransaction from '../../lib/umi/sendAndConfirm.js'

export default class GenesisRefund extends TransactionCommand<typeof GenesisRefund> {
  static override description = `Refund a deposit from a Genesis launch pool.

Refunds are only available after the deposit window closes, and only in two cases:

- The launch missed its minimum quote token threshold. The launch failed, and the
  full deposit is refunded.
- The launch exceeded its soft cap. The launch succeeded, and only the portion of
  the deposit above the cap is refunded. Token allocation is unaffected, so this
  can be run before or after claiming.

The program derives the amount, so there is no amount flag.`

  static override examples = [
    '$ mplx genesis refund GenesisAddress123...',
    '$ mplx genesis refund GenesisAddress123... --bucketIndex 1',
    '$ mplx genesis refund GenesisAddress123... --recipient RecipientAddress...',
  ]

  static override usage = 'genesis refund [GENESIS] [FLAGS]'

  static override args = {
    genesis: Args.string({
      description: 'The Genesis account address',
      required: true,
    }),
  }

  static override flags = {
    bucketIndex: Flags.integer({
      char: 'b',
      description: 'Index of the launch pool bucket (default: 0)',
      default: 0,
    }),
    recipient: Flags.string({
      description: 'Depositor being refunded (default: signer). Refunds can be cranked on another wallet behalf',
      required: false,
    }),
  }

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(GenesisRefund)
    const spinner = ora('Processing refund...').start()

    try {
      const genesisAddress = publicKey(args.genesis)
      const recipientAddress = flags.recipient
        ? publicKey(flags.recipient)
        : this.context.umi.identity.publicKey

      spinner.text = 'Fetching Genesis account details...'
      const genesisAccount = await safeFetchGenesisAccountV2(this.context.umi, genesisAddress)

      if (!genesisAccount) {
        spinner.fail('Genesis account not found')
        this.error(`Genesis account not found at address: ${args.genesis}`)
      }

      const [bucketPda] = findLaunchPoolBucketV2Pda(this.context.umi, {
        genesisAccount: genesisAddress,
        bucketIndex: flags.bucketIndex,
      })

      spinner.text = 'Verifying launch pool bucket...'
      const bucket = await safeFetchLaunchPoolBucketV2(this.context.umi, bucketPda)

      if (!bucket) {
        spinner.fail('Launch pool bucket not found')
        this.error(`Launch pool bucket not found at index ${flags.bucketIndex}`)
      }

      const depositPda = findLaunchPoolDepositV2Pda(this.context.umi, {
        bucket: bucketPda,
        recipient: recipientAddress,
      })

      spinner.text = 'Verifying deposit...'
      const deposit = await safeFetchLaunchPoolDepositV2(this.context.umi, depositPda)

      if (!deposit) {
        spinner.fail('Deposit not found')
        this.error(`No deposit found for ${recipientAddress} in this launch pool.`)
      }

      if (deposit.refunded) {
        spinner.fail('Deposit already refunded')
        this.error(`The deposit for ${recipientAddress} has already been refunded.`)
      }

      // Mirror the program's refund eligibility rules so the user gets a clear
      // reason instead of LaunchPoolThresholdMet from the program.
      const softCap = unwrapOption(bucket.extensions.softCap)
      const threshold = unwrapOption(bucket.extensions.minimumQuoteTokenThreshold)
      const total = bucket.quoteTokenDepositTotal

      const thresholdFailed = threshold !== null && total < threshold.amount
      const oversubscribed = softCap !== null && total > softCap.amount

      if (!thresholdFailed && !oversubscribed) {
        spinner.fail('Refund not available')
        this.error(
          'This launch pool is not refundable. Refunds require either a missed minimum quote token threshold ' +
          `or deposits above a soft cap. Total deposits: ${total}` +
          (threshold ? `, threshold: ${threshold.amount}` : ', no threshold set') +
          (softCap ? `, soft cap: ${softCap.amount}` : ', no soft cap set') + '.'
        )
      }

      // Estimated only. The program recomputes it, and rounds the filled
      // portion up, so the on-chain figure can be a few units lower.
      const estimated = thresholdFailed
        ? deposit.amountQuoteToken
        : computeExcessRefund(deposit.amountQuoteToken, softCap!.amount, total)

      spinner.text = 'Submitting refund...'
      const transaction = refundLaunchPoolV2(this.context.umi, {
        genesisAccount: genesisAddress,
        bucket: bucketPda,
        baseMint: genesisAccount.baseMint,
        quoteMint: genesisAccount.quoteMint,
        depositPda,
        recipient: recipientAddress,
        payer: this.context.payer,
      })

      const result = await umiSendAndConfirmTransaction(this.context.umi, transaction)
      const signature = txSignatureToString(result.transaction.signature as Uint8Array)

      spinner.succeed('Refund processed successfully!')

      this.log('')
      this.logSuccess(thresholdFailed ? 'Full deposit refunded' : 'Excess deposit refunded')
      this.log('')
      this.log('Refund Details:')
      this.log(`  Genesis Account: ${genesisAddress}`)
      this.log(`  Bucket: ${bucketPda}`)
      this.log(`  Bucket Index: ${flags.bucketIndex}`)
      this.log(`  Recipient: ${recipientAddress}`)
      this.log(`  Reason: ${thresholdFailed ? 'Minimum quote token threshold not met' : 'Deposits exceeded the soft cap'}`)
      this.log(`  Original Deposit: ${deposit.amountQuoteToken}`)
      this.log(`  Refunded (approx): ${estimated}`)
      if (!thresholdFailed) {
        this.log('')
        this.log('  Token allocation is unaffected by an excess refund.')
        this.log('  Run "mplx genesis claim" to claim tokens if you have not already.')
      }
      this.log('')
      this.log(`Transaction: ${signature}`)
      this.log('')
      this.log(
        generateExplorerUrl(this.context.explorer, this.context.chain, signature, 'transaction')
      )

      return {
        genesisAccount: genesisAddress.toString(),
        bucket: bucketPda.toString(),
        bucketIndex: flags.bucketIndex,
        recipient: recipientAddress.toString(),
        reason: thresholdFailed ? 'threshold-not-met' : 'soft-cap-exceeded',
        fullRefund: thresholdFailed,
        originalDeposit: deposit.amountQuoteToken.toString(),
        estimatedRefund: estimated.toString(),
        signature,
        explorer: generateExplorerUrl(this.context.explorer, this.context.chain, signature, 'transaction'),
      }

    } catch (error) {
      spinner.fail('Failed to process refund')
      throw error
    }
  }
}

