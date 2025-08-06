import { 
  fetchDistribution,
  withdraw
} from '@metaplex-foundation/mpl-distro'
import { 
  createTokenIfMissing,
  findAssociatedTokenPda
} from '@metaplex-foundation/mpl-toolbox'
import { TransactionBuilder, publicKey } from '@metaplex-foundation/umi'
import { Args, Flags } from '@oclif/core'
import ora from 'ora'

import { TransactionCommand } from '../../TransactionCommand.js'
import { generateExplorerUrl } from '../../explorers.js'
import { txSignatureToString } from '../../lib/util.js'

export default class DistroWithdraw extends TransactionCommand<typeof DistroWithdraw> {
  static override args = {
    distribution: Args.string({
      description: 'Distribution address',
      required: true,
    }),
  }

  static override description = `Withdraw tokens from a distribution.

This command withdraws tokens from a distribution back to the authority or a specified recipient.
Only the distribution authority can withdraw tokens.
Withdrawals may be restricted during active distribution periods depending on the distribution settings.`

  static override examples = [
    '$ mplx distro withdraw DistroAddress123... --amount 1000000',
    '$ mplx distro withdraw DistroAddress123... --amount 5000000000 --recipient RecipientWallet123...',
  ]

  static override flags = {
    amount: Flags.string({
      char: 'a',
      description: 'Amount to withdraw (in smallest unit)',
      required: true,
    }),
    recipient: Flags.string({
      char: 'r',
      description: 'Recipient wallet address (defaults to authority)',
      required: false,
    }),
  }

  static override usage = 'distro withdraw [DISTRIBUTION] [FLAGS]'

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(DistroWithdraw)
    const spinner = ora('Withdrawing tokens...').start()

    try {
      const distributionAddress = publicKey(args.distribution)
      
      // Fetch distribution to get mint and authority
      spinner.text = 'Fetching distribution details...'
      const distribution = await fetchDistribution(this.context.umi, distributionAddress)
      const {mint} = distribution

      // Verify the signer is the authority
      if (distribution.authority !== this.context.signer.publicKey) {
        throw new Error(`Only the distribution authority can withdraw tokens. Authority: ${distribution.authority}`)
      }

      // Parse amount
      const amount = BigInt(flags.amount)

      // Determine recipient (defaults to authority)
      const recipient = flags.recipient 
        ? publicKey(flags.recipient)
        : this.context.signer.publicKey

      // Get token accounts
      const recipientTokenAccount = findAssociatedTokenPda(this.context.umi, {
        mint,
        owner: recipient,
      })

      const distributionTokenAccount = findAssociatedTokenPda(this.context.umi, {
        mint,
        owner: distributionAddress,
      })

      spinner.text = 'Creating withdraw transaction...'

      // Create token account for recipient if missing
      const createTokenIfMissingIx = createTokenIfMissing(this.context.umi, {
        mint,
        owner: recipient,
      })

      // Create withdraw instruction
      const withdrawIx = withdraw(this.context.umi, {
        amount,
        authority: this.context.signer,
        distribution: distributionAddress,
        distributionTokenAccount,
        mint,
        payer: this.context.payer,
        recipient,
        recipientTokenAccount,
      })

      // Build and send transaction
      const transaction = new TransactionBuilder()
        .add(createTokenIfMissingIx)
        .add(withdrawIx)

      spinner.text = 'Sending transaction...'
      const result = await transaction.sendAndConfirm(this.context.umi)

      spinner.succeed('Tokens withdrawn successfully!')

      // Display results
      this.log('')
      this.logSuccess(`Withdrew ${amount} tokens from distribution`)
      this.log(`Distribution: ${distributionAddress}`)
      this.log(`Mint: ${mint}`)
      this.log(`Amount: ${amount}`)
      this.log(`Recipient: ${recipient}`)
      this.log('')
      this.log(`Transaction: ${txSignatureToString(result.signature)}`)
      this.log('')
      this.log(
        generateExplorerUrl(
          this.context.explorer,
          this.context.chain,
          txSignatureToString(result.signature),
          'transaction'
        )
      )

    } catch (error) {
      spinner.fail('Failed to withdraw tokens')
      throw error
    }
  }
}