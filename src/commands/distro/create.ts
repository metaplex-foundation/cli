import {
  AllowedDistributor,
  DistributionType,
  computeTreeHeight,
  createDistribution,
  findDistributionPda
} from '@metaplex-foundation/mpl-distro'
import { generateSigner, publicKey } from '@metaplex-foundation/umi'
import { base58 } from '@metaplex-foundation/umi/serializers'
import { Flags } from '@oclif/core'
import ora from 'ora'

import { TransactionCommand } from '../../TransactionCommand.js'
import { generateExplorerUrl } from '../../explorers.js'
import { readJsonSync } from '../../lib/file.js'
import { txSignatureToString } from '../../lib/util.js'
import umiSendAndConfirmTransaction from '../../lib/umi/sendAndConfirm.js'
import createDistroPrompt from '../../lib/distro/prompts/create-distro-wizard.js'


export default class DistroCreate extends TransactionCommand<typeof DistroCreate> {
  static override description = `Create a new token distribution using MPL Distro.

This command creates a distribution that allows tokens to be claimed by specified recipients.
You must provide an existing mint address for the distribution.

The distribution uses a Merkle tree structure to efficiently manage claimants and their allocations.

You can either provide all required flags individually or use a distro config JSON file with the following structure:

{
  "name": "Community Airdrop",
  "mint": "TokenMint123...",
  "totalClaimants": 1000,
  "startTime": "2024-01-01T00:00:00Z",
  "endTime": "2024-12-31T23:59:59Z",
  "merkleRoot": "base58EncodedRoot",
  "distributionType": "wallet",
  "subsidizeReceipts": false,
  "allowedDistributor": "permissionless"
}`

  static override examples = [
    '$ mplx distro create --wizard',
    '$ mplx distro create --distroConfig ./distribution-config.json',
    '$ mplx distro create --name "Community Airdrop" --mint "TokenMint123..." --totalClaimants 1000 --startTime "2024-01-01T00:00:00Z" --endTime "2024-12-31T23:59:59Z" --merkleRoot "base58EncodedRoot"',
    '$ mplx distro create --name "Reward Distribution" --mint "TokenMint123..." --totalClaimants 500 --startTime "2024-06-01T12:00:00Z" --endTime "2024-06-30T12:00:00Z" --merkleRoot "base58EncodedRoot" --distributionType legacy-nft',
  ]

  static override flags = {
    wizard: Flags.boolean({
      description: 'Use interactive wizard to create a distribution',
      required: false,
      exclusive: ['name', 'mint', 'totalClaimants', 'startTime', 'endTime', 'merkleRoot', 'distroConfig'],
    }),
    allowedDistributor: Flags.option({
      default: 'permissionless',
      description: 'Who is allowed to distribute tokens',
      options: ['permissionless', 'recipient'],
      required: false,
    })(),
    distroConfig: Flags.file({
      description: 'Path to config JSON file with distribution parameters',
      exclusive: ['name', 'mint', 'totalClaimants', 'startTime', 'endTime', 'merkleRoot'],
      required: false,
    }),
    distributionType: Flags.option({
      default: 'wallet',
      description: 'Type of distribution',
      options: ['wallet', 'legacy-nft'],
      required: false,
    })(),
    endTime: Flags.string({
      description: 'End time for the distribution (ISO date string)',
      required: false,
    }),
    merkleRoot: Flags.string({
      description: 'Merkle root (32 bytes, base58 encoded)',
      required: false,
    }),
    mint: Flags.string({
      char: 'm',
      description: 'Mint address for the distribution',
      required: false,
    }),
    name: Flags.string({
      char: 'n',
      description: 'Name of the distribution',
      required: false,
    }),
    startTime: Flags.string({
      description: 'Start time for the distribution (ISO date string)',
      required: false,
    }),
    subsidizeReceipts: Flags.boolean({
      default: false,
      description: 'Whether to subsidize receipt creation costs',
      required: false,
    }),
    totalClaimants: Flags.integer({
      char: 't',
      description: 'Total number of claimants in the distribution',
      required: false,
    })
  }

  static override usage = 'distro create [FLAGS]'

  public async run(): Promise<void> {
    const { flags } = await this.parse(DistroCreate)

    if (flags.wizard) {
      this.log(
        `--------------------------------
    
    Welcome to the Distribution Creator Wizard!

    This wizard will guide you through the process of creating a new distribution.                
                
--------------------------------`
      )

      const wizardData = await createDistroPrompt()

      const spinner = ora('Creating distribution...').start()

      try {
        const distributionResult = await this.createDistributionFromConfig(wizardData)
        spinner.succeed('Distribution created successfully!')
        this.displayDistributionResults(distributionResult)

      } catch (error) {
        spinner.fail('Failed to create distribution')
        throw error
      }

    } else {

      // Run direct creation with flags or config file

      const spinner = ora('Creating distribution...').start()


      try {
        // Load config from file or use individual flags
        let config: any
        if (flags.distroConfig) {
          config = readJsonSync(flags.distroConfig)
        } else {
          // Validate required flags are provided
          const requiredFlags = ['name', 'mint', 'totalClaimants', 'startTime', 'endTime', 'merkleRoot']
          for (const flag of requiredFlags) {
            if (!flags[flag as keyof typeof flags]) {
              throw new Error(`Missing required flag: --${flag}`)
            }
          }

          config = {
            allowedDistributor: flags.allowedDistributor,
            distributionType: flags.distributionType,
            endTime: flags.endTime,
            merkleRoot: flags.merkleRoot,
            mint: flags.mint,
            name: flags.name,
            startTime: flags.startTime,
            subsidizeReceipts: flags.subsidizeReceipts,
            totalClaimants: flags.totalClaimants,
          }
        }

        const distributionResult = await this.createDistributionFromConfig(config)
        spinner.succeed('Distribution created successfully!')
        this.displayDistributionResults(distributionResult)

      } catch (error) {
        spinner.fail('Failed to create distribution')
        throw error
      }
    }
  }

  private displayDistributionResults(distributionResult: any): void {
    this.log('')
    this.logSuccess(`Distribution created: ${distributionResult.distributionPda}`)
    this.log(`Name: ${distributionResult.config.name}`)
    this.log(`Mint: ${distributionResult.mint}`)
    this.log(`Total Claimants: ${distributionResult.totalClaimants}`)
    this.log(`Distribution Type: ${distributionResult.distributionType === DistributionType.Wallet ? 'Wallet' : 'Legacy NFT'}`)
    this.log(`Start Time: ${new Date(Number(distributionResult.startTime) * 1000).toISOString()}`)
    this.log(`End Time: ${new Date(Number(distributionResult.endTime) * 1000).toISOString()}`)
    this.log('')
    this.log(`Transaction: ${txSignatureToString(distributionResult.result.transaction.signature as Uint8Array)}`)
    this.log('')
    this.log(
      generateExplorerUrl(
        this.context.explorer,
        this.context.chain,
        txSignatureToString(distributionResult.result.transaction.signature as Uint8Array),
        'transaction'
      )
    )
  }

  // TODO - Add Fix Any
  private async createDistributionFromConfig(config: any) {
    const mint = publicKey(config.mint)

    // Parse timestamps from ISO strings to seconds since epoch
    const startTime = BigInt(Math.floor(new Date(config.startTime).getTime() / 1000))
    const endTime = BigInt(Math.floor(new Date(config.endTime).getTime() / 1000))

    // Generate seed signer
    const seed = generateSigner(this.context.umi)

    // Parse merkle root
    const merkleRoot = base58.serialize(config.merkleRoot)

    // Parse distribution type
    const distributionType = config.distributionType === 'legacy-nft'
      ? DistributionType.LegacyNft
      : DistributionType.Wallet

    // Parse allowed distributor
    const allowedDistributor = config.allowedDistributor === 'recipient'
      ? AllowedDistributor.Recipient
      : AllowedDistributor.Permissionless

    // Calculate tree height
    const totalClaimants = BigInt(config.totalClaimants)
    const treeHeight = computeTreeHeight(Number(totalClaimants))

    // Create the distribution
    const transaction = createDistribution(this.context.umi, {
      allowedDistributor,
      authority: this.context.signer,
      distributionType,
      endTime,
      merkleRoot,
      mint,
      name: config.name,
      payer: this.context.payer,
      seed,
      startTime,
      subsidizeReceipts: config.subsidizeReceipts,
      totalClaimants,
      treeHeight,
    })

    const result = await umiSendAndConfirmTransaction(this.context.umi, transaction)

    // Get the distribution PDA
    const distributionPda = findDistributionPda(this.context.umi, {
      mint,
      seed: seed.publicKey,
    })

    return {
      result,
      distributionPda,
      mint,
      totalClaimants,
      treeHeight,
      distributionType,
      startTime,
      endTime,
      config,
    }
  }
}
