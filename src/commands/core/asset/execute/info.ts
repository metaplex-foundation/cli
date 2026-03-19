import { fetchAsset, findAssetSignerPda } from '@metaplex-foundation/mpl-core'
import { amountToNumber, publicKey } from '@metaplex-foundation/umi'
import { Args } from '@oclif/core'
import ora from 'ora'

import { TransactionCommand } from '../../../../TransactionCommand.js'

export default class ExecuteInfo extends TransactionCommand<typeof ExecuteInfo> {
  static override description = 'Show the asset signer PDA address and its SOL balance'

  static override examples = [
    '<%= config.bin %> <%= command.id %> <assetId>',
  ]

  static override args = {
    assetId: Args.string({ description: 'Asset ID to derive the signer PDA for', required: true }),
  }

  public async run(): Promise<unknown> {
    const { args } = await this.parse(ExecuteInfo)
    const { umi } = this.context

    const spinner = ora('Fetching asset signer info...').start()

    try {
      const assetPubkey = publicKey(args.assetId)

      // Verify asset exists
      await fetchAsset(umi, assetPubkey)

      const [assetSignerPda] = findAssetSignerPda(umi, { asset: assetPubkey })
      const balance = await umi.rpc.getBalance(assetSignerPda)
      const balanceNumber = amountToNumber(balance)

      spinner.succeed('Asset signer info retrieved')

      this.logSuccess(
        `--------------------------------
  Asset:         ${args.assetId}
  Signer PDA:    ${assetSignerPda.toString()}
  SOL Balance:   ${balanceNumber} SOL
--------------------------------`
      )

      return {
        asset: args.assetId,
        signerPda: assetSignerPda.toString(),
        balance: balanceNumber,
      }
    } catch (error) {
      spinner.fail('Failed to fetch asset signer info')
      throw error
    }
  }
}
