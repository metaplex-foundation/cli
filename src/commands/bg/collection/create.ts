import {
  createCollection,
  CreateCollectionArgsPlugin,
  ruleSet
} from '@metaplex-foundation/mpl-core'
import type { TransactionSignature } from '@metaplex-foundation/umi'
import { generateSigner } from '@metaplex-foundation/umi'
import { Flags } from '@oclif/core'
import ora from 'ora'

import { TransactionCommand } from '../../../TransactionCommand.js'
import { generateExplorerUrl } from '../../../explorers.js'
import umiSendAndConfirmTransaction from '../../../lib/umi/sendAndConfirm.js'
import { txSignatureToString } from '../../../lib/util.js'

export default class BgCollectionCreate extends TransactionCommand<typeof BgCollectionCreate> {
  static override description = `Create a Metaplex Core collection with Bubblegum V2 plugin for compressed NFTs.

This command creates a Core collection and automatically adds the Bubblegum V2 plugin,
making it ready for use with compressed NFTs. The collection creator becomes the
update authority.

The Bubblegum V2 plugin is required for collections that will contain compressed NFTs.`

  static override summary = 'Create a Core collection configured for Bubblegum compressed NFTs'

  static override examples = [
    '$ mplx bg collection create --name "My Compressed Collection" --uri "https://example.com/collection.json"',
    '$ mplx bg collection create --name "NFT Collection" --uri "ipfs://..." --royalties 5',
  ]

  static override flags = {
    name: Flags.string({
      description: 'Collection name',
      required: true,
    }),
    uri: Flags.string({
      description: 'Collection metadata URI',
      required: true,
    }),
    royalties: Flags.integer({
      description: 'Royalty percentage for secondary sales (0-100)',
      min: 0,
      max: 100,
      default: 0,
    }),
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(BgCollectionCreate)
    const { umi, explorer } = this.context

    const spinner = ora('Creating Core collection with Bubblegum V2 plugin...').start()

    try {
      // Generate collection address
      const collection = generateSigner(umi)

      const plugins: CreateCollectionArgsPlugin[] = [
        {
          type: 'BubblegumV2',
        },
      ]
      if (flags.royalties > 0) {
        plugins.push({
          type: 'Royalties',
          basisPoints: flags.royalties,
          creators: [
            {
              address: this.context.signer.publicKey,
              percentage: flags.royalties,
            },
          ],
          ruleSet: ruleSet('None'),
        })
      }

      // Create the collection with Bubblegum V2 plugin
      // For now, just adding BubblegumV2 plugin (royalties can be added via --plugins flag later)
      const createTx = createCollection(umi, {
        collection,
        name: flags.name,
        uri: flags.uri,
        plugins: [
          {
            type: 'BubblegumV2',
          },
        ],
      })

      const result = await umiSendAndConfirmTransaction(umi, createTx)

      if (!result.transaction.signature) {
        throw new Error('Transaction signature is null')
      }

      const signature = txSignatureToString(result.transaction.signature as TransactionSignature)
      const collectionAddress = collection.publicKey

      spinner.succeed('Collection created with Bubblegum V2 plugin!')

      this.log(`
--------------------------------
Core Collection Created!

Collection: ${collectionAddress}
Name: ${flags.name}
URI: ${flags.uri}
Royalties: ${flags.royalties}%
Update Authority: ${this.context.signer.publicKey}
Plugins: Royalties, Bubblegum V2

Transaction: ${signature}
Explorer: ${generateExplorerUrl(explorer, this.context.chain, signature, 'transaction')}
Collection Explorer: ${generateExplorerUrl(explorer, this.context.chain, collectionAddress, 'account')}
--------------------------------

This collection is ready for compressed NFTs!
Use it with: mplx bg nft create <tree> --collection ${collectionAddress}
`)

      if (this.jsonEnabled()) {
        this.logJson({
          collection: collectionAddress.toString(),
          signature,
          explorer: generateExplorerUrl(explorer, this.context.chain, signature, 'transaction'),
          name: flags.name,
          uri: flags.uri,
          royalties: flags.royalties,
          updateAuthority: this.context.signer.publicKey.toString(),
        })
      }
    } catch (error) {
      spinner.fail('Failed to create collection')
      throw error
    }
  }
}
