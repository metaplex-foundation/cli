import { Command } from '@oclif/core'

export default class BgNftCommand extends Command {
  static override description = 'Compressed NFT tools (create, fetch, etc.)'

  static override summary = 'Subcommands for working with Bubblegum compressed NFTs'

  static override examples = [
    '<%= config.bin %> <%= command.id %> create --wizard',
    '<%= config.bin %> <%= command.id %> create <tree-name> --wizard',
    '<%= config.bin %> <%= command.id %> create <tree-address> --name "My NFT" --uri https://example.com/meta.json',
    '<%= config.bin %> <%= command.id %> fetch <asset-id>',
    '<%= config.bin %> <%= command.id %> update <asset-id> --name "New Name"',
    '<%= config.bin %> <%= command.id %> update <asset-id> --editor',
    '<%= config.bin %> <%= command.id %> transfer <asset-id> <new-owner>',
    '<%= config.bin %> <%= command.id %> burn <asset-id>',
  ]

  public async run(): Promise<void> {
    this.log(`
Bubblegum Compressed NFT Commands

  create    Create a compressed NFT into a Merkle tree (wizard or manual modes)
  fetch     Fetch a compressed NFT with its merkle proof
  update    Update a compressed NFT's metadata
  transfer  Transfer a compressed NFT to a new owner
  burn      Burn a compressed NFT (irreversible)

Recommended Workflow:
  1. Create a Metaplex Core collection (optional but recommended):
     $ mplx core collection create --wizard

  2. Create a Bubblegum tree:
     $ mplx bg tree create --wizard

  3. Create compressed NFTs in the tree:
     $ mplx bg nft create --wizard

  4. Update compressed NFT metadata:
     $ mplx bg nft update <asset-id> --editor

  5. Transfer compressed NFTs:
     $ mplx bg nft transfer <asset-id> <new-owner>

  6. Burn compressed NFTs (irreversible):
     $ mplx bg nft burn <asset-id>

Run any subcommand with --help for details:
  $ mplx bg nft create --help
  $ mplx bg nft fetch --help
  $ mplx bg nft update --help
  $ mplx bg nft transfer --help
  $ mplx bg nft burn --help
`)
  }
}

