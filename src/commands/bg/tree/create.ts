import { confirm, input, select } from '@inquirer/prompts'
import { Flags } from '@oclif/core'
import ora from 'ora'

import { createTreeV2 } from '@metaplex-foundation/mpl-bubblegum'
import { generateSigner, TransactionSignature } from '@metaplex-foundation/umi'
import { generateExplorerUrl } from '../../../explorers.js'
import umiSendAndConfirmTransaction from '../../../lib/umi/sendAndConfirm.js'
import { txSignatureToString } from '../../../lib/util.js'
import { TransactionCommand } from '../../../TransactionCommand.js'
import { saveTree, getNetworkInfo, isValidTreeName, loadTrees } from '../../../lib/treeStorage.js'

interface TreeConfig {
  maxDepth: number
  maxBufferSize: number
  canopyDepth: number
  maxNfts: number
  estimatedCost: number
  costPerNft: number
  proofsRequired: number
  proofBytes: number
}

const TREE_CONFIGS: TreeConfig[] = [
  { maxDepth: 14, maxBufferSize: 64, canopyDepth: 8, maxNfts: 16384, estimatedCost: 0.3358, costPerNft: 0.00002550, proofsRequired: 6, proofBytes: 192 },
  { maxDepth: 16, maxBufferSize: 64, canopyDepth: 10, maxNfts: 65536, estimatedCost: 0.7069, costPerNft: 0.00001579, proofsRequired: 6, proofBytes: 192 },
  { maxDepth: 18, maxBufferSize: 64, canopyDepth: 12, maxNfts: 262144, estimatedCost: 2.1042, costPerNft: 0.00001303, proofsRequired: 6, proofBytes: 192 },
  { maxDepth: 20, maxBufferSize: 1024, canopyDepth: 13, maxNfts: 1048576, estimatedCost: 8.5012, costPerNft: 0.00001311, proofsRequired: 7, proofBytes: 224 },
  { maxDepth: 24, maxBufferSize: 2048, canopyDepth: 15, maxNfts: 16777216, estimatedCost: 26.1201, costPerNft: 0.00000656, proofsRequired: 9, proofBytes: 288 },
  { maxDepth: 26, maxBufferSize: 2048, canopyDepth: 17, maxNfts: 67108864, estimatedCost: 70.8213, costPerNft: 0.00000606, proofsRequired: 9, proofBytes: 288 },
  { maxDepth: 30, maxBufferSize: 2048, canopyDepth: 17, maxNfts: 1073741824, estimatedCost: 72.6468, costPerNft: 0.00000507, proofsRequired: 13, proofBytes: 416 },
]

export default class BgCreate extends TransactionCommand<typeof BgCreate> {
  static override description = `Create a Bubblegum Merkle Tree for compressed NFTs.

Use the interactive wizard to select from recommended tree configurations based on your needs:
- Small collections (16K NFTs): Low cost, quick setup
- Medium collections (65K-262K NFTs): Balanced cost and capacity  
- Large collections (1M+ NFTs): Maximum capacity, higher upfront cost

The wizard will guide you through selecting the optimal tree size based on your collection requirements.`

  static override examples = [
    '$ mplx bg tree create --wizard',
    '$ mplx bg tree create --maxDepth 14 --maxBufferSize 64 --canopyDepth 8',
  ]

  static override flags = {
    wizard: Flags.boolean({
      description: 'Use interactive wizard to create tree',
      required: false
    }),
    maxDepth: Flags.integer({
      description: 'Maximum depth of the tree (determines max NFTs)',
      exclusive: ['wizard']
    }),
    maxBufferSize: Flags.integer({
      description: 'Maximum buffer size for concurrent changes',
      exclusive: ['wizard']
    }),
    canopyDepth: Flags.integer({
      description: 'Canopy depth for verification optimization',
      exclusive: ['wizard']
    }),
    public: Flags.boolean({
      description: 'Make tree public (allows anyone to mint NFTs)',
      exclusive: ['wizard']
    }),
    name: Flags.string({
      description: 'Short name for the tree (for easy reference)',
      exclusive: ['wizard']
    }),
  }

  private formatTreeConfig(config: TreeConfig): string {
    return `${config.maxNfts.toLocaleString()} NFTs (Proofs: ${config.proofsRequired}, ${config.proofBytes} bytes) - ~${config.estimatedCost} SOL`
  }

  private async runWizard() {
    this.log(`
--------------------------------
    
    Welcome to the Bubblegum Tree Creator!
    
    This wizard will help you create a Merkle tree for compressed NFTs.
    Choose a configuration based on your collection size needs.
                
--------------------------------`)

    const selectedConfig = await select({
      message: 'Select your tree configuration:',
      choices: TREE_CONFIGS.map((config, index) => ({
        name: this.formatTreeConfig(config),
        value: index,
        description: `Cost: ${config.estimatedCost} SOL | Proofs: ${config.proofsRequired} (${config.proofBytes} bytes) | Per NFT: ${config.costPerNft.toFixed(8)} SOL`
      }))
    })

    const config = TREE_CONFIGS[selectedConfig]

    const isPublic = await confirm({
      message: '⚠️  Make tree public? (WARNING: Anyone can mint NFTs to this tree)',
      default: false
    })

    if (isPublic) {
      this.log(`
⚠️  WARNING: You have chosen to make this tree public.
This means ANYONE can mint compressed NFTs to your tree.
Only proceed if you understand the implications.
`)

      const confirmPublic = await confirm({
        message: 'Are you sure you want to create a public tree?',
        default: false
      })

      if (!confirmPublic) {
        this.log('Tree creation cancelled.')
        return
      }
    }

    const treeName = await input({
      message: 'Enter a short name for this tree (for easy reference):',
      validate: async (value) => {
        if (!value.trim()) {
          return 'Tree name cannot be empty'
        }
        if (!isValidTreeName(value.trim())) {
          return 'Tree name can only contain letters, numbers, hyphens, underscores, and spaces (1-50 characters)'
        }

        // Check for duplicates before starting the transaction
        try {
          const { network } = await getNetworkInfo(this.context.umi)
          const existingTrees = loadTrees()
          const duplicate = existingTrees.find(t => t.name === value.trim() && t.network === network)

          if (duplicate) {
            return `Tree with name "${value.trim()}" already exists on ${network}. Please choose a different name.`
          }
        } catch (error) {
          // If we can't check for duplicates, allow it (saveTree will catch it later)
        }

        return true
      }
    })

    this.log(`
Selected Configuration:
- Max NFTs: ${config.maxNfts.toLocaleString()}
- Tree Depth: ${config.maxDepth}
- Buffer Size: ${config.maxBufferSize}
- Canopy Depth: ${config.canopyDepth}
- Proofs Required: ${config.proofsRequired} (${config.proofBytes} bytes per transaction)
- Public Tree: ${isPublic ? 'Yes ⚠️' : 'No'}
- Tree Name: ${treeName.trim()}
- Estimated Cost: ~${config.estimatedCost} SOL
`)

    const confirmed = await confirm({
      message: 'Create tree with this configuration?',
      default: true
    })

    if (!confirmed) {
      this.log('Tree creation cancelled.')
      return
    }

    return this.createTree(config.maxDepth, config.maxBufferSize, config.canopyDepth, isPublic, treeName.trim())
  }

  private async createTree(maxDepth: number, maxBufferSize: number, canopyDepth: number, isPublic: boolean = false, name?: string) {
    const { umi, explorer } = this.context
    const spinner = ora('Creating Merkle tree...').start()

    try {
      const merkleTree = generateSigner(umi)

      const createTreeTx = await createTreeV2(umi, {
        merkleTree,
        maxDepth,
        maxBufferSize,
        canopyDepth,
        public: isPublic,
      })

      const result = await umiSendAndConfirmTransaction(umi, createTreeTx)

      if (!result.transaction.signature) {
        throw new Error('Transaction signature is null')
      }

      const signature = txSignatureToString(result.transaction.signature as TransactionSignature)
      const treeAddress = merkleTree.publicKey

      // Save tree to storage if name is provided
      if (name) {
        try {
          const { network, genesisHash } = await getNetworkInfo(umi)
          await saveTree({
            name,
            address: treeAddress.toString(),
            maxDepth,
            maxBufferSize,
            canopyDepth,
            isPublic,
            maxNfts: Math.pow(2, maxDepth),
            createdAt: new Date().toISOString(),
            signature,
            network,
            genesisHash
          })
          
          spinner.succeed(`Merkle tree created and saved as "${name}"!`)
        } catch (saveError) {
          spinner.succeed('Merkle tree created successfully!')
          this.warn(`Failed to save tree: ${saveError}`)
        }
      } else {
        spinner.succeed('Merkle tree created successfully!')
      }

      this.log(`
--------------------------------
Tree Created Successfully!

Tree Name: ${name || 'Not saved'}
Tree Address: ${treeAddress}
Max Depth: ${maxDepth}
Max Buffer Size: ${maxBufferSize}  
Canopy Depth: ${canopyDepth}
Public Tree: ${isPublic ? 'Yes ⚠️' : 'No'}
Max NFTs: ${Math.pow(2, maxDepth).toLocaleString()}

Transaction: ${signature}
Explorer: ${generateExplorerUrl(explorer, this.context.chain, signature, 'transaction')}
Tree Explorer: ${generateExplorerUrl(explorer, this.context.chain, treeAddress.toString(), 'account')}
--------------------------------`)

      return { treeAddress: treeAddress.toString(), maxDepth, maxBufferSize, canopyDepth, signature }

    } catch (error) {
      spinner.fail(`Failed to create tree: ${error}`)
      throw error
    }
  }

  public async run(): Promise<unknown> {
    const { flags } = await this.parse(BgCreate)

    if (flags.wizard) {
      return await this.runWizard()
    } else if (flags.maxDepth && flags.maxBufferSize && flags.canopyDepth) {
      // Validate the configuration exists in our recommended configs
      const validConfig = TREE_CONFIGS.find(config =>
        config.maxDepth === flags.maxDepth &&
        config.maxBufferSize === flags.maxBufferSize &&
        config.canopyDepth === flags.canopyDepth
      )

      if (!validConfig) {
        this.warn('This configuration is not in our recommended list. Use --wizard to see recommended configurations.')
      }

      // Validate and normalize tree name if provided
      let normalizedName: string | undefined
      if (flags.name !== undefined) {
        normalizedName = flags.name.trim()

        if (!normalizedName) {
          this.error('Tree name cannot be empty')
        }

        if (!isValidTreeName(normalizedName)) {
          this.error('Tree name can only contain letters, numbers, hyphens, underscores, and spaces (1-50 characters)')
        }

        // Check for duplicate names early to avoid wasting the transaction
        try {
          const { network } = await getNetworkInfo(this.context.umi)
          const existingTrees = loadTrees()
          const duplicate = existingTrees.find(t => t.name === normalizedName && t.network === network)

          if (duplicate) {
            this.error(`Tree with name "${normalizedName}" already exists on ${network}. Please choose a different name.`)
          }
        } catch (error) {
          // If we can't check for duplicates, proceed anyway (saveTree will catch it later)
          this.warn(`Warning: Could not check for duplicate tree names: ${error}`)
        }
      }

      return await this.createTree(flags.maxDepth, flags.maxBufferSize, flags.canopyDepth, flags.public, normalizedName)
    } else {
      this.error('You must either use --wizard or provide all required flags: --maxDepth, --maxBufferSize, --canopyDepth')
    }
  }
}