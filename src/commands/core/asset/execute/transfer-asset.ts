import { execute, fetchAsset, fetchCollection, findAssetSignerPda, transfer } from '@metaplex-foundation/mpl-core'
import { createNoopSigner, publicKey } from '@metaplex-foundation/umi'
import { Args } from '@oclif/core'
import ora from 'ora'

import { generateExplorerUrl } from '../../../../explorers.js'
import { TransactionCommand } from '../../../../TransactionCommand.js'
import { txSignatureToString } from '../../../../lib/util.js'

export default class ExecuteTransferAsset extends TransactionCommand<typeof ExecuteTransferAsset> {
  static override description = 'Transfer a Core Asset owned by an asset\'s signer PDA to a new owner'

  static override examples = [
    '<%= config.bin %> <%= command.id %> <signingAssetId> <targetAssetId> <newOwner>',
  ]

  static override args = {
    assetId: Args.string({ description: 'Asset whose signer PDA owns the target asset', required: true }),
    targetAssetId: Args.string({ description: 'Asset to transfer (must be owned by the signer PDA)', required: true }),
    newOwner: Args.string({ description: 'New owner of the target asset', required: true }),
  }

  public async run(): Promise<unknown> {
    const { args } = await this.parse(ExecuteTransferAsset)
    const { umi, explorer, chain } = this.context

    const spinner = ora('Fetching assets...').start()

    try {
      const signingAssetPubkey = publicKey(args.assetId)
      const signingAsset = await fetchAsset(umi, signingAssetPubkey)

      let signingCollection
      if (signingAsset.updateAuthority.type === 'Collection' && signingAsset.updateAuthority.address) {
        signingCollection = await fetchCollection(umi, signingAsset.updateAuthority.address)
      }

      const targetAssetPubkey = publicKey(args.targetAssetId)
      const targetAsset = await fetchAsset(umi, targetAssetPubkey)

      let targetCollection
      if (targetAsset.updateAuthority.type === 'Collection' && targetAsset.updateAuthority.address) {
        targetCollection = await fetchCollection(umi, targetAsset.updateAuthority.address)
      }

      const [assetSignerPda] = findAssetSignerPda(umi, { asset: signingAssetPubkey })

      // Verify the target asset is owned by the signer PDA
      if (targetAsset.owner.toString() !== assetSignerPda.toString()) {
        spinner.fail('Transfer failed')
        this.error(`Target asset is not owned by the asset signer PDA.\nExpected owner: ${assetSignerPda.toString()}\nActual owner: ${targetAsset.owner.toString()}`)
      }

      const transferIx = transfer(umi, {
        asset: targetAsset,
        collection: targetCollection,
        newOwner: publicKey(args.newOwner),
        authority: createNoopSigner(assetSignerPda),
      })

      spinner.text = 'Executing asset transfer...'

      const result = await execute(umi, {
        asset: signingAsset,
        collection: signingCollection,
        instructions: transferIx,
      }).sendAndConfirm(umi)

      const signature = txSignatureToString(result.signature)
      const explorerUrl = generateExplorerUrl(explorer, chain, signature, 'transaction')

      spinner.succeed('Asset transferred from signer PDA')

      this.logSuccess(
        `--------------------------------
  Signing Asset:  ${args.assetId}
  Target Asset:   ${args.targetAssetId}
  New Owner:      ${args.newOwner}
  Signature:      ${signature}
--------------------------------`
      )
      this.log(explorerUrl)

      return {
        signingAsset: args.assetId,
        targetAsset: args.targetAssetId,
        newOwner: args.newOwner,
        signature,
        explorer: explorerUrl,
      }
    } catch (error) {
      spinner.fail('Failed to execute asset transfer')
      throw error
    }
  }
}
