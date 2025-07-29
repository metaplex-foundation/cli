import { Command, Flags } from '@oclif/core'
import { listTrees } from '../../../lib/treeStorage.js'

export default class BgTreeListCommand extends Command {
  static override description = 'List all saved Bubblegum trees'

  static override examples = [
    '$ mplx bg tree list',
    '$ mplx bg tree list --network mainnet',
    '$ mplx bg tree list --network devnet'
  ]

  static override flags = {
    network: Flags.string({
      description: 'Filter trees by network',
      options: ['mainnet', 'devnet', 'testnet', 'localnet'],
      required: false
    })
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(BgTreeListCommand)

    const trees = listTrees(flags.network as 'mainnet' | 'devnet' | 'testnet' | 'localnet')

    if (!trees || trees.length === 0) {
      if (flags.network) {
        this.log(`No trees found on ${flags.network}`)
      } else {
        this.log('No trees found. Create one with: mplx bg create --wizard')
      }
      return
    }

    this.log(`\nSaved Trees${flags.network ? ` (${flags.network})` : ''}:`)
    
    // Format trees for display
    const formattedTrees = trees.map(tree => ({
      'Name': tree.name,
      'Address': tree.address,
      'Network': tree.network,
      'Max NFTs': tree.maxNfts.toLocaleString(),
      'Public': tree.isPublic ? 'Yes ⚠️' : 'No',
      'Created': new Date(tree.createdAt).toLocaleDateString()
    }))

    console.table(formattedTrees)

    this.log(`\nTotal: ${trees.length} tree${trees.length === 1 ? '' : 's'}`)
    
    if (!flags.network) {
      this.log('\nTip: Use --network flag to filter by specific network')
    }
  }
}