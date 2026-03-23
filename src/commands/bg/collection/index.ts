import { Command } from '@oclif/core'

export default class BgCollection extends Command {
  static override description = 'Manage Bubblegum collections'

  static override examples = [
    '<%= config.bin %> <%= command.id %> create --name "My Collection" --uri "https://example.com/metadata.json"',
  ]

  public async run(): Promise<void> {
    this.log(`
Bubblegum Collection Commands:

  create  Create a Core collection configured for Bubblegum compressed NFTs

Use "mplx bg collection create --help" for more information.
`)
  }
}
