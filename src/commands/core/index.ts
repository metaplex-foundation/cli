import {Args, Command, Flags} from '@oclif/core'

export default class Core extends Command {
  static override description = `MPL Core Program - Manage digital assets, collections, and plugins on Solana

The core commands provide functionality for managing Metaplex Core assets, collections, and plugins. These commands allow you to create, modify, and manage digital assets on the Solana blockchain using the Metaplex Core protocol.

Available subcommands:
  asset     - Manage individual digital assets (create, update, burn, fetch)
  collection - Manage collections of assets (create, fetch)
  plugins   - Manage asset and collection plugins (add, remove, generate)`

  static override examples = [
    '$ mplx core asset create --name "My NFT" --uri "https://example.com/metadata.json"',
    '$ mplx core collection create --name "My Collection" --uri "https://example.com/collection.json"',
    '$ mplx core plugins add <assetId> --wizard',
  ]

  static override flags = {
    help: Flags.help({char: 'h'}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(Core)
    
    // Show help by default
    this.log(Core.description)
    this.log('\nExamples:')
    Core.examples.forEach(example => {
      this.log(`  ${example}`)
    })
  }
}
