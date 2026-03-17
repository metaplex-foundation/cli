import { execute, fetchAsset, fetchCollection, findAssetSignerPda } from '@metaplex-foundation/mpl-core'
import { transferSol } from '@metaplex-foundation/mpl-toolbox'
import { createNoopSigner, publicKey, sol } from '@metaplex-foundation/umi'
import { Args } from '@oclif/core'
import ora from 'ora'

import { generateExplorerUrl } from '../../../../explorers.js'
import { TransactionCommand } from '../../../../TransactionCommand.js'
import { txSignatureToString } from '../../../../lib/util.js'

export default class ExecuteTransferSol extends TransactionCommand<typeof ExecuteTransferSol> {
  static override description = 'Transfer SOL from an asset\'s signer PDA to a destination address'

  static override examples = [
    '<%= config.bin %> <%= command.id %> <assetId> 0.5 <destination>',
  ]

  static override args = {
    assetId: Args.string({ description: 'Asset whose signer PDA holds the SOL', required: true }),
    amount: Args.string({ description: 'Amount of SOL to transfer', required: true }),
    destination: Args.string({ description: 'Destination address', required: true }),
  }

  public async run(): Promise<unknown> {
    const { args } = await this.parse(ExecuteTransferSol)
    const { umi, explorer, chain } = this.context

    const amountInSol = parseFloat(args.amount)
    if (isNaN(amountInSol) || amountInSol <= 0) {
      this.error('Amount must be a positive number')
    }

    const spinner = ora('Fetching asset...').start()

    try {
      const assetPubkey = publicKey(args.assetId)
      const asset = await fetchAsset(umi, assetPubkey)

      let collection
      if (asset.updateAuthority.type === 'Collection' && asset.updateAuthority.address) {
        collection = await fetchCollection(umi, asset.updateAuthority.address)
      }

      const [assetSignerPda] = findAssetSignerPda(umi, { asset: assetPubkey })

      const transferSolIx = transferSol(umi, {
        source: createNoopSigner(assetSignerPda),
        destination: publicKey(args.destination),
        amount: sol(amountInSol),
      })

      spinner.text = 'Executing transfer...'

      const result = await execute(umi, {
        asset,
        collection,
        instructions: transferSolIx,
      }).sendAndConfirm(umi)

      const signature = txSignatureToString(result.signature)
      const explorerUrl = generateExplorerUrl(explorer, chain, signature, 'transaction')

      spinner.succeed('SOL transferred from asset signer')

      this.logSuccess(
        `--------------------------------
  Asset:        ${args.assetId}
  Signer PDA:   ${assetSignerPda.toString()}
  Amount:       ${amountInSol} SOL
  Destination:  ${args.destination}
  Signature:    ${signature}
--------------------------------`
      )
      this.log(explorerUrl)

      return {
        asset: args.assetId,
        signerPda: assetSignerPda.toString(),
        amount: amountInSol,
        destination: args.destination,
        signature,
        explorer: explorerUrl,
      }
    } catch (error) {
      spinner.fail('Failed to execute SOL transfer')
      throw error
    }
  }
}
