import {Args, Command, Flags} from '@oclif/core'

export default class CoreCollection extends Command {
  static override description = `MPL Core Collection Management - Create and manage collections of digital assets

The collection commands provide functionality for managing groups of digital assets on the Solana blockchain using the Metaplex Core protocol.

Available subcommands:
  create   - Create new collections (with wizard, direct input, or file upload)
  fetch    - Fetch collection data and metadata
  template - Generate template files for collection metadata and image`

  static override examples = [
    '$ mplx core collection create --wizard',
    '$ mplx core collection create --name "My Collection" --uri "https://example.com/metadata.json"',
    '$ mplx core collection create --files --image "./my-collection.png" --json "./metadata.json"',
    '$ mplx core collection fetch <collectionId>',
    '$ mplx core collection template',
  ]

  static override flags = {
    help: Flags.help({char: 'h'}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(CoreCollection)
    
    // Show help by default
    this.log(CoreCollection.description)
    this.log('\nExamples:')
    CoreCollection.examples.forEach(example => {
      this.log(`  ${example}`)
    })
  }
}
