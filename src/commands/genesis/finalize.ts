import {
  finalizeV2,
  safeFetchGenesisAccountV2,
  findLaunchPoolBucketV2Pda,
  findPresaleBucketV2Pda,
  findUnlockedBucketV2Pda,
} from '@metaplex-foundation/genesis'
import { publicKey, AccountMeta } from '@metaplex-foundation/umi'
import { Args } from '@oclif/core'
import ora from 'ora'

import { TransactionCommand } from '../../TransactionCommand.js'
import { generateExplorerUrl } from '../../explorers.js'
import { txSignatureToString } from '../../lib/util.js'
import umiSendAndConfirmTransaction from '../../lib/umi/sendAndConfirm.js'

export default class GenesisFinalize extends TransactionCommand<typeof GenesisFinalize> {
  static override description = `Finalize a Genesis launch.

This command finalizes a Genesis account, marking the token launch as complete.
Once finalized, the launch configuration cannot be changed.

Requirements:
- You must be the authority of the Genesis account
- All buckets should be properly configured before finalizing
- The launch conditions should be met`

  static override examples = [
    '$ mplx genesis finalize GenesisAddress123...',
    '$ mplx genesis finalize 7nVDaSFJWnPpBXH5JQxUvK8YwMGp5VHrYLBhWAe5hJkv',
  ]

  static override usage = 'genesis finalize [GENESIS]'

  static override args = {
    genesis: Args.string({
      description: 'The Genesis account address to finalize',
      required: true,
    }),
  }

  public async run(): Promise<void> {
    const { args } = await this.parse(GenesisFinalize)
    const spinner = ora('Finalizing Genesis launch...').start()

    try {
      const genesisAddress = publicKey(args.genesis)

      // Fetch the Genesis account to get the base mint
      spinner.text = 'Fetching Genesis account details...'
      const genesisAccount = await safeFetchGenesisAccountV2(this.context.umi, genesisAddress)

      if (!genesisAccount) {
        spinner.fail('Genesis account not found')
        this.error(`Genesis account not found at address: ${args.genesis}`)
      }

      if (genesisAccount.finalized) {
        spinner.fail('Genesis account is already finalized')
        this.error('This Genesis account has already been finalized')
      }

      // Discover all bucket PDAs to pass as remaining accounts
      spinner.text = 'Discovering bucket accounts...'
      const bucketAccounts: AccountMeta[] = []
      const pdaFinders = [
        findLaunchPoolBucketV2Pda,
        findPresaleBucketV2Pda,
        findUnlockedBucketV2Pda,
      ]

      for (let i = 0; i < genesisAccount.bucketCount; i++) {
        for (const finder of pdaFinders) {
          const [pda] = finder(this.context.umi, {
            genesisAccount: genesisAddress,
            bucketIndex: i,
          })
          const account = await this.context.umi.rpc.getAccount(pda)
          if (account.exists) {
            bucketAccounts.push({
              pubkey: pda,
              isSigner: false,
              isWritable: true,
            })
          }
        }
      }

      // Build the finalize transaction
      spinner.text = 'Finalizing Genesis launch...'
      const transaction = finalizeV2(this.context.umi, {
        genesisAccount: genesisAddress,
        baseMint: genesisAccount.baseMint,
        authority: this.context.signer,
      }).addRemainingAccounts(bucketAccounts)

      const result = await umiSendAndConfirmTransaction(this.context.umi, transaction)

      spinner.succeed('Genesis launch finalized successfully!')

      this.log('')
      this.logSuccess(`Genesis Account: ${genesisAddress}`)
      this.log(`Base Mint: ${genesisAccount.baseMint}`)
      this.log(`Status: Finalized`)
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
      spinner.fail('Failed to finalize Genesis launch')
      throw error
    }
  }
}
