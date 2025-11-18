import { Args } from '@oclif/core'
import ora from 'ora'
import { publicKey, PublicKey } from '@metaplex-foundation/umi'
import { getAssetWithProof, burnV2 } from '@metaplex-foundation/mpl-bubblegum'

import { TransactionCommand } from '../../../TransactionCommand.js'
import { generateExplorerUrl } from '../../../explorers.js'
import umiSendAndConfirmTransaction from '../../../lib/umi/sendAndConfirm.js'
import { txSignatureToString } from '../../../lib/util.js'
import { TransactionSignature } from '@metaplex-foundation/umi'

export default class BgNftBurn extends TransactionCommand<typeof BgNftBurn> {
  static override description = `Burn a Bubblegum compressed NFT.

This command fetches the asset data and merkle proof, then executes a burnV2
instruction to permanently destroy the compressed NFT.

Note: The current owner (or their delegate) must be the signer. This action is irreversible.`

  static override summary = 'Burn a compressed NFT'

  static override examples = [
    '$ mplx bg nft burn <assetId>',
  ]

  static override args = {
    assetId: Args.string({
      description: 'The compressed NFT asset ID (leaf asset ID) to burn',
      required: true,
    }),
  }

  public async run(): Promise<void> {
    const { args } = await this.parse(BgNftBurn)
    const { umi, explorer } = this.context

    // Validate asset ID
    let assetPubkey: PublicKey
    try {
      assetPubkey = publicKey(args.assetId)
    } catch {
      this.error(`Invalid asset ID: ${args.assetId}`)
    }

    const spinner = ora('Fetching asset and proof data...').start()

    try {
      // Fetch asset with proof using SDK helper
      const assetWithProof = await getAssetWithProof(umi, assetPubkey, {
        truncateCanopy: true,
      })

      spinner.succeed('Asset and proof data fetched')

      const burnSpinner = ora('Verifying ownership...').start()

      // Verify the current signer owns the asset or is the delegate
      const leafOwner = assetWithProof.leafOwner
      const leafDelegate = assetWithProof.leafDelegate

      const signerKey = this.context.signer.publicKey.toString()
      const ownerKey = leafOwner.toString()
      const delegateKey = leafDelegate.toString()

      if (signerKey !== ownerKey && signerKey !== delegateKey) {
        burnSpinner.fail('Burn failed')
        this.error(
          `Signer (${signerKey}) is not the owner (${ownerKey}) or delegate (${delegateKey}) of this asset.`
        )
      }

      burnSpinner.text = 'Burning compressed NFT...'

      // Build and execute burn using assetWithProof spread
      const burnBuilder = burnV2(umi, {
        ...assetWithProof,
      })

      const result = await umiSendAndConfirmTransaction(umi, burnBuilder)
      const rawSignature = result.transaction.signature as TransactionSignature
      const signature = txSignatureToString(rawSignature)

      burnSpinner.succeed('Compressed NFT burned successfully!')

      this.printSummary({
        signature,
        assetId: args.assetId,
        owner: leafOwner.toString(),
        tree: assetWithProof.merkleTree.toString(),
      })

      if (this.jsonEnabled()) {
        this.logJson({
          signature,
          explorer: generateExplorerUrl(explorer, this.context.chain, signature, 'transaction'),
          assetId: args.assetId,
          owner: leafOwner.toString(),
          tree: assetWithProof.merkleTree.toString(),
        })
      }
    } catch (error) {
      spinner.fail('Failed to burn compressed NFT')
      throw error
    }
  }

  private printSummary(summary: {
    signature: string
    assetId: string
    owner: string
    tree: string
  }) {
    this.log(`
--------------------------------
Compressed NFT Burned!

Asset ID: ${summary.assetId}
Owner: ${summary.owner}
Tree: ${summary.tree}

Signature: ${summary.signature}
Explorer: ${generateExplorerUrl(this.context.explorer, this.context.chain, summary.signature, 'transaction')}
--------------------------------`)
  }
}
