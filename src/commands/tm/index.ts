import {Args, Command, Flags} from '@oclif/core'

export default class Tm extends Command {
  static override description = 'Token Metadata Program - Create and manage NFTs using MPL Token Metadata'

  static override examples = [
    '<%= config.bin %> <%= command.id %> create --wizard',
    '<%= config.bin %> <%= command.id %> create --name "My NFT" --uri "https://example.com/metadata.json"',
  ]

  static override flags = {

  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(Tm)

  }
}