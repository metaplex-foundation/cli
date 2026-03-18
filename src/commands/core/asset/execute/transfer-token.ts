import { execute, fetchAsset, fetchCollection, findAssetSignerPda } from '@metaplex-foundation/mpl-core'
import { createAssociatedToken, findAssociatedTokenPda, transferTokens } from '@metaplex-foundation/mpl-toolbox'
import { createNoopSigner, publicKey } from '@metaplex-foundation/umi'
import { Args, Flags } from '@oclif/core'
import ora from 'ora'

import { generateExplorerUrl } from '../../../../explorers.js'
import { TransactionCommand } from '../../../../TransactionCommand.js'
import { txSignatureToString } from '../../../../lib/util.js'

export default class ExecuteTransferToken extends TransactionCommand<typeof ExecuteTransferToken> {
  static override description = 'Transfer SPL tokens from an asset\'s signer PDA to a destination address'

  static override examples = [
    '<%= config.bin %> <%= command.id %> <assetId> --mint <mintAddress> --amount 1000 --destination <address>',
  ]

  static override args = {
    assetId: Args.string({ description: 'Asset whose signer PDA holds the tokens', required: true }),
  }

  static override flags = {
    mint: Flags.string({ description: 'Token mint address', required: true }),
    amount: Flags.integer({ description: 'Amount to transfer in smallest unit (e.g., lamports for wrapped SOL)', required: true }),
    destination: Flags.string({ description: 'Destination wallet address', required: true }),
  }

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(ExecuteTransferToken)
    const { umi, explorer, chain } = this.context

    const spinner = ora('Fetching asset...').start()

    try {
      const assetPubkey = publicKey(args.assetId)
      const asset = await fetchAsset(umi, assetPubkey)

      let collection
      if (asset.updateAuthority.type === 'Collection' && asset.updateAuthority.address) {
        collection = await fetchCollection(umi, asset.updateAuthority.address)
      }

      const [assetSignerPda] = findAssetSignerPda(umi, { asset: assetPubkey })
      const mintPubkey = publicKey(flags.mint)
      const destinationPubkey = publicKey(flags.destination)

      // Create the destination token account if it doesn't exist, then transfer
      const createAtaIx = createAssociatedToken(umi, {
        mint: mintPubkey,
        owner: destinationPubkey,
      })

      const transferTokensIx = transferTokens(umi, {
        source: findAssociatedTokenPda(umi, {
          mint: mintPubkey,
          owner: assetSignerPda,
        }),
        destination: findAssociatedTokenPda(umi, {
          mint: mintPubkey,
          owner: destinationPubkey,
        }),
        authority: createNoopSigner(assetSignerPda),
        amount: flags.amount,
      })

      // Collect all instructions as a flat array for the execute wrapper
      const instructions = [
        ...createAtaIx.getInstructions(),
        ...transferTokensIx.getInstructions(),
      ]

      spinner.text = 'Executing token transfer...'

      const result = await execute(umi, {
        asset,
        collection,
        instructions,
      }).sendAndConfirm(umi)

      const signature = txSignatureToString(result.signature)
      const explorerUrl = generateExplorerUrl(explorer, chain, signature, 'transaction')

      spinner.succeed('Tokens transferred from asset signer')

      this.logSuccess(
        `--------------------------------
  Asset:        ${args.assetId}
  Signer PDA:   ${assetSignerPda.toString()}
  Mint:         ${flags.mint}
  Amount:       ${flags.amount}
  Destination:  ${flags.destination}
  Signature:    ${signature}
--------------------------------`
      )
      this.log(explorerUrl)

      return {
        asset: args.assetId,
        signerPda: assetSignerPda.toString(),
        mint: flags.mint,
        amount: flags.amount,
        destination: flags.destination,
        signature,
        explorer: explorerUrl,
      }
    } catch (error) {
      spinner.fail('Failed to execute token transfer')
      throw error
    }
  }
}
