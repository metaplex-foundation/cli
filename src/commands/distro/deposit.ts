import { 
  deposit,
  fetchDistribution
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
    '$ mplx distro deposit DistroAddress123... --amount 1000000',
    '$ mplx distro deposit DistroAddress123... --amount 5000000000',
  ]

  static override flags = {
    amount: Flags.string({
      char: 'a',
      description: 'Amount to deposit (in smallest unit)',
      required: true,
    }),
  }

  static override usage = 'distro deposit [DISTRIBUTION] [FLAGS]'

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(DistroDeposit)
    const spinner = ora('Depositing tokens...').start()

    try {
      const distributionAddress = publicKey(args.distribution)
      
      // Fetch distribution to get mint and other details
      spinner.text = 'Fetching distribution details...'
      const distribution = await fetchDistribution(this.context.umi, distributionAddress)
      const {mint} = distribution

      // Parse amount
      const amount = BigInt(flags.amount)

      // Get token accounts
      const depositorTokenAccount = findAssociatedTokenPda(this.context.umi, {
        mint,
        owner: this.context.signer.publicKey,
      })

      const distributionTokenAccount = findAssociatedTokenPda(this.context.umi, {
        mint,
        owner: distributionAddress,
      })

      spinner.text = 'Creating deposit transaction...'

      // Create token account for distribution if missing
      const createTokenIfMissingIx = createTokenIfMissing(this.context.umi, {
        mint,
        owner: distributionAddress,
      })

      // Create deposit instruction
      const depositIx = deposit(this.context.umi, {
        amount,
        depositor: this.context.signer,
        depositorTokenAccount,
        distribution: distributionAddress,
        distributionTokenAccount,
        mint,
        payer: this.context.payer,
      })

      // Build and send transaction
      const transaction = new TransactionBuilder()
        .add(createTokenIfMissingIx)
        .add(depositIx)

      spinner.text = 'Sending transaction...'
      const result = await transaction.sendAndConfirm(this.context.umi)

      spinner.succeed('Tokens deposited successfully!')

      // Display results
      this.log('')
      this.logSuccess(`Deposited ${amount} tokens to distribution`)
      this.log(`Distribution: ${distributionAddress}`)
      this.log(`Mint: ${mint}`)
      this.log(`Amount: ${amount}`)
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