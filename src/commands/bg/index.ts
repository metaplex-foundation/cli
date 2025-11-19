import {Command} from '@oclif/core'

export default class Bg extends Command {
  static override description =
    'Manage Bubblegum compressed NFTs. Create and inspect Merkle trees used for minting compressed assets.'

  static override summary = 'Namespace for Bubblegum (compressed NFT) utilities.'

  static override examples = [
    '<%= config.bin %> <%= command.id %> tree create --wizard',
    '<%= config.bin %> <%= command.id %> tree list --network mainnet',
    '<%= config.bin %> <%= command.id %> nft create --wizard',
  ]

  public async run(): Promise<void> {
    this.log(`
Bubblegum (Compressed NFTs)

Use the bg namespace to work with Bubblegum-compatible Merkle trees that
back compressed NFT collections on Solana.

Available commands:
  tree create    Create a Merkle tree for compressed NFTs
  tree list      List saved trees (filter with --network)
  nft create     Create compressed NFTs into a Bubblegum tree
  nft fetch      Fetch a compressed NFT with its merkle proof
  nft update     Update a compressed NFT's metadata
  nft transfer   Transfer a compressed NFT to a new owner
  nft burn       Burn a compressed NFT (irreversible)

Complete Workflow:
  1. (Optional) Create a Metaplex Core collection for your compressed NFTs:
     $ mplx core collection create --wizard

  2. Create a Bubblegum tree to hold your compressed NFTs:
     $ mplx bg tree create --wizard

  3. Create compressed NFTs into your tree:
     $ mplx bg nft create --wizard

Note: Bubblegum V2 uses Metaplex Core collections. Create them with:
  $ mplx core collection create --wizard

See subcommand help for complete options:
  $ mplx bg tree --help
  $ mplx bg nft --help
`)
  }
}