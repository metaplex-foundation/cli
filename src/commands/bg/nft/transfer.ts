import { Args } from '@oclif/core'
import ora from 'ora'
import { publicKey, PublicKey } from '@metaplex-foundation/umi'
import { getAssetWithProof, transferV2 } from '@metaplex-foundation/mpl-bubblegum'

import { TransactionCommand } from '../../../TransactionCommand.js'
import { generateExplorerUrl } from '../../../explorers.js'
import umiSendAndConfirmTransaction from '../../../lib/umi/sendAndConfirm.js'
import { txSignatureToString } from '../../../lib/util.js'
import { TransactionSignature } from '@metaplex-foundation/umi'

export default class BgNftTransfer extends TransactionCommand<typeof BgNftTransfer> {
  static override description = `Transfer a Bubblegum compressed NFT to a new owner.

This command fetches the asset data and merkle proof, then executes a transferV2
instruction to transfer ownership of the compressed NFT.

Note: The current owner (or their delegate) must be the signer.`

  static override summary = 'Transfer a compressed NFT to a new owner'

  static override examples = [
    '$ mplx bg nft transfer <assetId> <newOwner>',
  ]

  static override args = {
    assetId: Args.string({
      description: 'The compressed NFT asset ID (leaf asset ID) to transfer',
      required: true,
    }),
    newOwner: Args.string({
      description: 'The public key of the new owner',
      required: true,
    }),
  }

  public async run(): Promise<void> {
    const { args } = await this.parse(BgNftTransfer)
    const { umi, explorer } = this.context

    // Validate asset ID
    let assetPubkey: PublicKey
    try {
      assetPubkey = publicKey(args.assetId)
    } catch {
      this.error(`Invalid asset ID: ${args.assetId}`)
    }

    // Validate new owner
    let newOwnerPubkey: PublicKey
    try {
      newOwnerPubkey = publicKey(args.newOwner)
    } catch {
      this.error(`Invalid new owner address: ${args.newOwner}`)
    }

    const spinner = ora('Fetching asset and proof data...').start()

    try {
      // Fetch asset with proof using SDK helper
      const assetWithProof = await getAssetWithProof(umi, assetPubkey, {
        truncateCanopy: true,
      })

      spinner.succeed('Asset and proof data fetched')

      const transferSpinner = ora('Verifying ownership...').start()

      // Verify the current signer owns the asset or is the delegate
      const leafOwner = assetWithProof.leafOwner
      const leafDelegate = assetWithProof.leafDelegate

      const signerKey = this.context.signer.publicKey.toString()
      const ownerKey = leafOwner.toString()
      const delegateKey = leafDelegate.toString()

      if (signerKey !== ownerKey && signerKey !== delegateKey) {
        transferSpinner.fail('Transfer failed')
        this.error(
          `Signer (${signerKey}) is not the owner (${ownerKey}) or delegate (${delegateKey}) of this asset.`
        )
      }

      transferSpinner.text = 'Executing transfer...'

      // Build and execute transfer using assetWithProof spread
      const transferBuilder = transferV2(umi, {
        ...assetWithProof,
        newLeafOwner: newOwnerPubkey,
      })

      const result = await umiSendAndConfirmTransaction(umi, transferBuilder)
      const rawSignature = result.transaction.signature as TransactionSignature
      const signature = txSignatureToString(rawSignature)

      transferSpinner.succeed('Compressed NFT transferred successfully!')

      this.printSummary({
        signature,
        assetId: args.assetId,
        from: leafOwner.toString(),
        to: args.newOwner,
        tree: assetWithProof.merkleTree.toString(),
      })

      if (this.jsonEnabled()) {
        this.logJson({
          signature,
          explorer: generateExplorerUrl(explorer, this.context.chain, signature, 'transaction'),
          assetId: args.assetId,
          from: leafOwner.toString(),
          to: args.newOwner,
          tree: assetWithProof.merkleTree.toString(),
        })
      }
    } catch (error) {
      spinner.fail('Failed to transfer compressed NFT')
      throw error
    }
  }

  private printSummary(summary: {
    signature: string
    assetId: string
    from: string
    to: string
    tree: string
  }) {
    this.log(`
--------------------------------
Compressed NFT Transferred!

Asset ID: ${summary.assetId}
From: ${summary.from}
To: ${summary.to}
Tree: ${summary.tree}

Signature: ${summary.signature}
Explorer: ${generateExplorerUrl(this.context.explorer, this.context.chain, summary.signature, 'transaction')}
--------------------------------`)
  }
}
