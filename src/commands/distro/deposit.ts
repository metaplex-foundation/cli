import { 
  deposit,
  fetchDistribution
} from '@metaplex-foundation/mpl-distro'
import { 
  createTokenIfMissing,
  findAssociatedTokenPda,
  fetchMint,
  fetchToken
} from '@metaplex-foundation/mpl-toolbox'
import { TransactionBuilder, publicKey } from '@metaplex-foundation/umi'
import { Args, Flags } from '@oclif/core'
import ora from 'ora'

import { TransactionCommand } from '../../TransactionCommand.js'
import { generateExplorerUrl } from '../../explorers.js'
import { txSignatureToString } from '../../lib/util.js'

export default class DistroDeposit extends TransactionCommand<typeof DistroDeposit> {
  static override args = {
    distribution: Args.string({
      description: 'Distribution address',
      required: true,
    }),
  }

  static override description = `Deposit tokens into an existing distribution.

This command deposits tokens from your wallet into a distribution created by mplx distro create.
The distribution must be active and you must have the tokens in your wallet.`

  static override examples = [
    '$ mplx distro deposit DistroAddress123... --amount 1.0',
    '$ mplx distro deposit DistroAddress123... --basisAmount 1000000',
  ]

  static override flags = {
    amount: Flags.string({
      char: 'a',
      description: 'Amount to deposit (human-readable with decimals, e.g., 1.5 for 1.5 tokens)',
      required: false,
      exclusive: ['basisAmount'],
    }),
    basisAmount: Flags.string({
      char: 'b',
      description: 'Amount to deposit in smallest unit (e.g., 1000000 for 1 token with 6 decimals)',
      required: false,
      exclusive: ['amount'],
    }),
  }

  static override usage = 'distro deposit [DISTRIBUTION] [FLAGS]'

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(DistroDeposit)
    
    if (!flags.amount && !flags.basisAmount) {
      throw new Error('Either --amount or --basisAmount must be provided')
    }

    const spinner = ora('Depositing tokens...').start()

    try {
      const distributionAddress = publicKey(args.distribution)
      
      spinner.text = 'Fetching distribution details...'
      const distribution = await fetchDistribution(this.context.umi, distributionAddress)
      const {mint} = distribution

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

      const depositorTokenAccount = findAssociatedTokenPda(this.context.umi, {
        mint,
        owner: this.context.signer.publicKey,
      })

      const distributionTokenAccount = findAssociatedTokenPda(this.context.umi, {
        mint,
        owner: distributionAddress,
      })

      spinner.text = 'Checking token balance...'
      try {
        const depositorToken = await fetchToken(this.context.umi, depositorTokenAccount)
        if (depositorToken.amount < basisAmount) {
          const depositorBalance = Number(depositorToken.amount) / Math.pow(10, decimals)
          throw new Error(
            `Insufficient balance. You have ${depositorBalance} tokens (${depositorToken.amount} basis) but trying to deposit ${formattedAmount} tokens (${basisAmount} basis)`
          )
        }
      } catch (error: any) {
        if (error.message?.includes('Account does not exist')) {
          throw new Error('You do not have a token account for this mint. Please ensure you have the tokens first.')
        }
        throw error
      }

      spinner.text = 'Creating deposit transaction...'

      const createTokenIfMissingIx = createTokenIfMissing(this.context.umi, {
        mint,
        owner: distributionAddress,
      })
      const depositIx = deposit(this.context.umi, {
        amount: basisAmount,
        depositor: this.context.signer,
        depositorTokenAccount,
        distribution: distributionAddress,
        distributionTokenAccount,
        mint,
        authority: this.context.signer,
        payer: this.context.payer,
      })
      const transaction = new TransactionBuilder()
        .add(createTokenIfMissingIx)
        .add(depositIx)

      spinner.text = 'Sending transaction...'
      const result = await transaction.sendAndConfirm(this.context.umi)

      spinner.succeed('Tokens deposited successfully!')

      this.log('')
      this.logSuccess(`Deposited ${formattedAmount} tokens (${basisAmount} basis) to distribution`)
      this.log(`Distribution: ${distributionAddress}`)
      this.log(`Mint: ${mint}`)
      this.log(`Amount deposited: ${formattedAmount} tokens (${basisAmount} basis)`)
      
      const newTotal = distribution.totalAmount + basisAmount
      const newTotalFormatted = Number(newTotal) / Math.pow(10, decimals)
      this.log(`New total deposited: ${newTotalFormatted} tokens (${newTotal} basis)`)
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
      spinner.fail('Failed to deposit tokens')
      throw error
    }
  }
}