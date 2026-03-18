import { fetchAsset, fetchCollection, isFrozen, LifecycleValidationError, transfer, validateTransfer } from '@metaplex-foundation/mpl-core'
import { publicKey } from '@metaplex-foundation/umi'
import { Args } from '@oclif/core'
import ora from 'ora'

import { generateExplorerUrl } from '../../../explorers.js'
import { TransactionCommand } from '../../../TransactionCommand.js'
import { getAssetSigner } from '../../../lib/umi/assetSignerPlugin.js'
import umiSendAndConfirmTransaction from '../../../lib/umi/sendAndConfirm.js'
import { txSignatureToString } from '../../../lib/util.js'

export default class AssetTransfer extends TransactionCommand<typeof AssetTransfer> {
  static override description = 'Transfer an MPL Core Asset to a new owner'

  static override examples = [
    '<%= config.bin %> <%= command.id %> <assetId> <newOwner>',
  ]

  static override args = {
    assetId: Args.string({ description: 'Asset to transfer', required: true }),
    newOwner: Args.string({ description: 'Public key of the new owner', required: true }),
  }

  public async run(): Promise<unknown> {
    const { args } = await this.parse(AssetTransfer)
    const { umi, explorer } = this.context

    const spinner = ora('Fetching asset...').start()

    try {
      const asset = await fetchAsset(umi, publicKey(args.assetId))

      let collection
      if (asset.updateAuthority.type === 'Collection' && asset.updateAuthority.address) {
        collection = await fetchCollection(umi, publicKey(asset.updateAuthority.address))
      }

      if (isFrozen(asset, collection)) {
        spinner.fail('Asset transfer failed')
        this.error('Cannot transfer: asset is frozen')
      }

      // Skip client-side validation for asset-signer wallets — the execute
      // instruction handles authorization on-chain via the PDA.
      if (!getAssetSigner(umi)) {
        const transferError = await validateTransfer(umi, {
          authority: umi.identity.publicKey,
          asset,
          collection,
          recipient: publicKey(args.newOwner),
        })

        if (transferError) {
          spinner.fail('Asset transfer failed')
          const message = transferError === LifecycleValidationError.NoAuthority
            ? 'Cannot transfer: you are not the owner or an authorized delegate of this asset'
            : `Cannot transfer: ${transferError}`
          this.error(message)
        }
      }

      spinner.text = 'Transferring asset...'

      const tx = transfer(umi, {
        asset,
        collection,
        newOwner: publicKey(args.newOwner),
      })

      const result = await umiSendAndConfirmTransaction(umi, tx)

      const signature = txSignatureToString(result.transaction.signature as Uint8Array)
      const explorerUrl = generateExplorerUrl(explorer, this.context.chain, signature, 'transaction')

      spinner.succeed(`Asset transferred: ${args.assetId}`)
      this.logSuccess(`--------------------------------
  Asset:     ${args.assetId}
  New Owner: ${args.newOwner}
  Signature: ${signature}
--------------------------------`)
      this.log(explorerUrl)

      return {
        asset: args.assetId,
        newOwner: args.newOwner,
        signature,
        explorer: explorerUrl,
      }
    } catch (error) {
      if (!spinner.isSpinning) throw error
      spinner.fail('Asset transfer failed')
      throw error
    }
  }
}
