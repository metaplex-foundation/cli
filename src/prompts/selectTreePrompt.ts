import { input, select } from '@inquirer/prompts'
import { listTrees } from '../lib/treeStorage.js'

export interface SelectTreePromptResult {
  treeAddress: string
  treeName?: string
}

const selectTreePrompt = async (network: 'mainnet' | 'devnet' | 'testnet' | 'localnet'): Promise<SelectTreePromptResult> => {
  // Load ALL saved trees
  const allTrees = listTrees()
  const currentNetworkTrees = listTrees(network)

  let treeAddress: string
  let treeName: string | undefined

  if (allTrees.length === 0) {
    // No saved trees at all
    console.log('\nNo saved trees found.')
    console.log('Create one with: mplx bg tree create --wizard\n')

    treeAddress = await input({
      message: 'Enter Merkle tree address:',
      validate: (value) => {
        if (!value) return 'Tree address is required'
        // Basic length check for Solana addresses
        if (value.length < 32 || value.length > 44) {
          return 'Invalid Solana address length'
        }
        return true
      },
    })
  } else {
    // Has saved trees - show all with network labels

    // Show warning if current network has no trees
    if (currentNetworkTrees.length === 0) {
      console.log(`\n⚠️  No saved trees found on ${network}, but you have trees on other networks.`)
      console.log('You can select from all saved trees or enter an address manually.\n')
    }

    const choices = [
      ...allTrees.map((tree) => {
        const networkMismatch = tree.network !== network
        const networkLabel = networkMismatch ? ` [${tree.network}] ⚠️` : ` [${tree.network}]`

        return {
          name: `${tree.name}${networkLabel} (${tree.address.slice(0, 8)}...${tree.address.slice(-8)}) - ${tree.maxNfts.toLocaleString()} NFTs`,
          value: tree.address,
          description: `Network: ${tree.network}${networkMismatch ? ' (WARNING: Different from current RPC!)' : ''}, Max NFTs: ${tree.maxNfts.toLocaleString()}, Depth: ${tree.maxDepth}`,
        }
      }),
      {
        name: 'Enter tree address manually',
        value: 'manual',
        description: 'Enter a Merkle tree address directly',
      },
    ]

    const selection = await select({
      message: `Select a Bubblegum tree (current network: ${network}):`,
      choices,
    })

    if (selection === 'manual') {
      treeAddress = await input({
        message: 'Enter Merkle tree address:',
        validate: (value) => {
          if (!value) return 'Tree address is required'
          // Basic length check for Solana addresses
          if (value.length < 32 || value.length > 44) {
            return 'Invalid Solana address length'
          }
          return true
        },
      })
    } else {
      // selection is the tree address
      treeAddress = selection
      // Find the tree name from the saved trees
      const selectedTreeData = allTrees.find(t => t.address === selection)
      treeName = selectedTreeData?.name
    }
  }

  return {
    treeAddress,
    treeName,
  }
}

export default selectTreePrompt
