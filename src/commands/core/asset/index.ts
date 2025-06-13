import { Command, Flags } from '@oclif/core'

export default class CoreAsset extends Command {
  static override description = `MPL Core Asset Management - Create, update, burn, and fetch digital assets

The asset commands provide functionality for managing individual digital assets on the Solana blockchain using the Metaplex Core protocol.

Available subcommands:
  create  - Create new assets (with wizard, direct input, or file upload)
  update  - Update asset metadata (name, URI, image)
  burn    - Burn assets (single or batch)
  fetch   - Fetch asset data and metadata`

  static override examples = [
    '$ mplx core asset create --wizard',
    '$ mplx core asset create --name "My NFT" --uri "https://example.com/metadata.json"',
    '$ mplx core asset create --files --image "./my-nft.png" --json "./metadata.json"',
    '$ mplx core asset update <assetId> --name "Updated Name" --uri "https://example.com/new-metadata.json"',
    '$ mplx core asset burn <assetId>',
    '$ mplx core asset fetch <assetId> --download',
  ]

  static override flags = {
    help: Flags.help({char: 'h'}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(CoreAsset)
    
    // Show help by default
    this.log(CoreAsset.description)
    this.log('\nExamples:')
    CoreAsset.examples.forEach(example => {
      this.log(`  ${example}`)
    })
  }
}
