import { 
  fetchDistribution,
  withdraw
} from '@metaplex-foundation/mpl-distro'
import { 
  findAssociatedTokenPda,
  fetchMint,
  fetchToken
} from '@metaplex-foundation/mpl-toolbox'
import { publicKey } from '@metaplex-foundation/umi'
import { Args, Flags } from '@oclif/core'
import ora from 'ora'

import { TransactionCommand } from '../../TransactionCommand.js'
import { generateExplorerUrl } from '../../explorers.js'
import { txSignatureToString } from '../../lib/util.js'
import umiSendAndConfirmTransaction from '../../lib/umi/sendAndConfirm.js'

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
    '$ mplx distro withdraw DistroAddress123... --amount 1.0',
    '$ mplx distro withdraw DistroAddress123... --basisAmount 1000000 --recipient RecipientWallet123...',
  ]

  static override flags = {
    amount: Flags.string({
      char: 'a',
      description: 'Amount to withdraw (human-readable with decimals, e.g., 1.5 for 1.5 tokens)',
      required: false,
      exclusive: ['basisAmount'],
    }),
    basisAmount: Flags.string({
      char: 'b',
      description: 'Amount to withdraw in smallest unit (e.g., 1000000 for 1 token with 6 decimals)',
      required: false,
      exclusive: ['amount'],
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
    
    if (!flags.amount && !flags.basisAmount) {
      throw new Error('Either --amount or --basisAmount must be provided')
    }

    const spinner = ora('Withdrawing tokens...').start()

    try {
      const distributionAddress = publicKey(args.distribution)
      
      spinner.text = 'Fetching distribution details...'
      const distribution = await fetchDistribution(this.context.umi, distributionAddress)
      const {mint} = distribution

      if (distribution.authority !== this.context.signer.publicKey) {
        throw new Error(`Only the distribution authority can withdraw tokens. Authority: ${distribution.authority}`)
      }

      spinner.text = 'Fetching mint details...'
      const mintAccount = await fetchMint(this.context.umi, mint)
      const decimals = mintAccount.decimals

      let basisAmount: bigint
      if (flags.basisAmount) {
        basisAmount = BigInt(flags.basisAmount)
      } else {
        const amount = parseFloat(flags.amount!)
        basisAmount = BigInt(Math.floor(amount * Math.pow(10, decimals)))
      }

      const formattedAmount = Number(basisAmount) / Math.pow(10, decimals)

      const recipient = flags.recipient 
        ? publicKey(flags.recipient)
        : this.context.signer.publicKey

      const recipientTokenAccount = findAssociatedTokenPda(this.context.umi, {
        mint,
        owner: recipient,
      })

      const distributionTokenAccount = findAssociatedTokenPda(this.context.umi, {
        mint,
        owner: distributionAddress,
      })

      spinner.text = 'Checking available balance for withdrawal...'
      const availableAmount = distribution.totalAmount - distribution.claimAmount
      const availableFormatted = Number(availableAmount) / Math.pow(10, decimals)
      
      if (availableAmount < basisAmount) {
        const totalDeposited = Number(distribution.totalAmount) / Math.pow(10, decimals)
        const totalClaimed = Number(distribution.claimAmount) / Math.pow(10, decimals)
        throw new Error(
          `Insufficient available balance for withdrawal.\n` +
          `Total deposited: ${totalDeposited} tokens (${distribution.totalAmount} basis)\n` +
          `Total claimed: ${totalClaimed} tokens (${distribution.claimAmount} basis)\n` +
          `Available for withdrawal: ${availableFormatted} tokens (${availableAmount} basis)\n` +
          `Trying to withdraw: ${formattedAmount} tokens (${basisAmount} basis)`
        )
      }
      
      try {
        const distributionToken = await fetchToken(this.context.umi, distributionTokenAccount)
        if (distributionToken.amount < basisAmount) {
          const actualBalance = Number(distributionToken.amount) / Math.pow(10, decimals)
          this.warn(
            `Warning: Token account balance (${actualBalance} tokens) is less than available amount (${availableFormatted} tokens).`
          )
        }
      } catch (error: any) {
        if (error.message?.includes('Account does not exist')) {
          throw new Error('Distribution does not have a token account. No tokens have been deposited yet.')
        }
      }

      spinner.text = 'Creating withdraw transaction...'

      const withdrawIx = withdraw(this.context.umi, {
        amount: basisAmount,
        authority: this.context.signer,
        distribution: distributionAddress,
        distributionTokenAccount,
        mint,
        payer: this.context.payer,
        recipient,
        recipientTokenAccount,
      })

      spinner.text = 'Sending transaction...'
      const result = await umiSendAndConfirmTransaction(this.context.umi, withdrawIx)

      spinner.succeed('Tokens withdrawn successfully!')

      this.log('')
      this.logSuccess(`Withdrew ${formattedAmount} tokens (${basisAmount} basis) from distribution`)
      this.log(`Distribution: ${distributionAddress}`)
      this.log(`Mint: ${mint}`)
      this.log(`Amount withdrawn: ${formattedAmount} tokens (${basisAmount} basis)`)
      this.log(`Recipient: ${recipient}`)
      
      const remainingAvailable = availableAmount - basisAmount
      const remainingFormatted = Number(remainingAvailable) / Math.pow(10, decimals)
      this.log(`Remaining available for withdrawal: ${remainingFormatted} tokens (${remainingAvailable} basis)`)
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
      spinner.fail('Failed to withdraw tokens')
      throw error
    }
  }
}