import { fetchMetadataFromSeeds, updateV1 } from '@metaplex-foundation/mpl-token-metadata'
import { publicKey } from '@metaplex-foundation/umi'
import { Args, Flags } from '@oclif/core'

import { TransactionCommand } from '../../TransactionCommand.js'
import { jsonStringify, txSignatureToString } from '../../lib/util.js'

/* 
  Update Possibilities:

  1. Update a single Asset by providing the Asset ID and the new name and/or URI.

  2. Update a single Asset by providing the Asset ID and a JSON file with the new metadata.

  3. Update a single Asset by providing the Asset ID and an image file to upload and assign to the Asset.

  4. Update multiple Assets by providing a folder path with JSON files named with Asset ids containing the new metadata.

  5. Update multiple Assets by providing a folder path with image files named with Asset ids to upload and assign to the Assets.

  6. Update multiple Assets by providing a folder path with JSON files named with Asset ids containing the new metadata and image files named with Asset ids to upload and assign to the Assets.

current: https://arweave.net/7BzVsHRrEH0ldNOCCM4_E00BiAYuJP_EQiqvcEYz3YY

 pnpm run mplx metadata update METAewgxyPbgwsseH8T16a39CQ5VyVxZi9zXiDPY18m -p usb://ledger -k usb://ledger -r https://metaplex-studio.rpcpool.com/5ebea512d12be102f53d319dafc8 --name "Metaplex" --uri https://arweave.net/NMoQF4gwcpFwmL7RCBfrrdbxGP9LkA3MO2ke767CU7Q

*/

export default class AssetUpdate extends TransactionCommand<typeof AssetUpdate> {
  static override args = {
    assetId: Args.string({ description: 'Asset to update', name: 'Asset ID', required: true }),
  }

  static override description = 'Update an spl token metadata'

  static examples = [
    'Single Asset Update:',
    '<%= config.bin %> <%= command.id %> <assetId> --name "Updated Asset" --uri "https://example.com/metadata.json"',
    '<%= config.bin %> <%= command.id %> <assetId> --name "Updated Asset"',
  ]

  static override flags = {
    name: Flags.string({ description: 'Asset name', name: "name" }),
    uri: Flags.string({ description: 'URI of the Asset metadata', name: "uri" }),
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(AssetUpdate)
    const {umi} = this.context
    const {assetId} = args
    const { name, uri } = flags

    if (!name && !uri) {
      this.error('You must provide at least one update flag: --name, --uri')
    }

    const mint = publicKey(assetId)
    
    const initialMetadata = await fetchMetadataFromSeeds(umi, { mint })
    console.log(jsonStringify(initialMetadata, 2))

    const newMetadata = {
      ...initialMetadata,
      name: name || initialMetadata.name,
      uri: uri || initialMetadata.uri,
    }
    console.log(jsonStringify(newMetadata, 2))

    const tx = updateV1(umi, {
      authority: umi.identity,
      data: newMetadata,
      mint,
    }).setVersion('legacy')

    const txStr = await tx.sendAndConfirm(umi)
    console.log(`Tx: ${txSignatureToString(txStr.signature)}`)
  }
}
