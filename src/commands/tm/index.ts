import { Command } from '@oclif/core'

export default class Tm extends Command {
  static override description = 'Token Metadata Program - Create and manage NFTs using MPL Token Metadata'

  static override examples = [
    '<%= config.bin %> <%= command.id %> create --wizard',
    '<%= config.bin %> <%= command.id %> create --name "My NFT" --uri "https://example.com/metadata.json"',
  ]

  public async run(): Promise<void> {
    // This command acts as a namespace for subcommands
    // Users should use specific subcommands like 'create'
    this.log('Available token metadata commands:')
    this.log('  create    - Create a new NFT using MPL Token Metadata')
    this.log('')
    this.log('Use --help with any command for more details')
    this.log('Example: mplx tm create --help')
  }
}