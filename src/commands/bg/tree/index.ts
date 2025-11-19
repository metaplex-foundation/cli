import { Command } from '@oclif/core'

export default class BgTreeCommand extends Command {
  static override description = 'Manage Bubblegum trees'

  static override examples = [
    '$ mplx bg tree create --wizard',
    '$ mplx bg tree list',
    '$ mplx bg tree list --network mainnet'
  ]

  public async run(): Promise<void> {
    this.log(`
Bubblegum Tree Management Commands:

  create  Create a new Merkle tree for compressed NFTs
          Options: --wizard (interactive), or specify --maxDepth, --maxBufferSize, --canopyDepth
          
  list    List all saved trees
          Options: --network [mainnet|devnet|testnet|localnet]

Examples:
  $ mplx bg tree create --wizard
  $ mplx bg tree create --maxDepth 14 --maxBufferSize 64 --canopyDepth 8 --name "my-tree"
  $ mplx bg tree list
  $ mplx bg tree list --network mainnet
`)
  }
}