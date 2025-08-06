import { 
  AllowedDistributor, 
  DistributionType, 
  computeTreeHeight,
  createDistribution,
  createMplDistroProgram,
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

export default class DistroCreate extends TransactionCommand<typeof DistroCreate> {
  static override description = `Create a new token distribution using MPL Distro.

This command creates a distribution that allows tokens to be claimed by specified recipients.
You must provide an existing mint address for the distribution.

The distribution uses a Merkle tree structure to efficiently manage claimants and their allocations.

You can either provide all required flags individually or use a config JSON file with the following structure:

{
  "name": "Community Airdrop",
  "mint": "TokenMint123...",
  "totalClaimants": 1000,
  "startTime": "2024-01-01T00:00:00Z",
  "endTime": "2024-12-31T23:59:59Z",
  "merkleRoot": "base58EncodedRoot",
  "distributionType": "wallet",
  "subsidizeReceipts": false,
  "allowedDistributor": "permissionless",
  "programId": "distro11111111111111111111111111111111111111111"
}`

  static override examples = [
    '$ mplx distro create --config ./distribution-config.json',
    '$ mplx distro create --name "Community Airdrop" --mint "TokenMint123..." --totalClaimants 1000 --startTime "2024-01-01T00:00:00Z" --endTime "2024-12-31T23:59:59Z" --merkleRoot "base58EncodedRoot"',
    '$ mplx distro create --name "Reward Distribution" --mint "TokenMint123..." --totalClaimants 500 --startTime "2024-06-01T12:00:00Z" --endTime "2024-06-30T12:00:00Z" --merkleRoot "base58EncodedRoot" --distributionType legacy-nft',
  ]

  static override flags = {
    allowedDistributor: Flags.option({
      default: 'permissionless',
      description: 'Who is allowed to distribute tokens',
      options: ['permissionless', 'recipient'],
      required: false,
    })(),
    config: Flags.file({
      description: 'Path to config JSON file with distribution parameters',
      exclusive: ['name', 'mint', 'totalClaimants', 'startTime', 'endTime', 'merkleRoot', 'programId'],
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
    const spinner = ora('Creating distribution...').start()

    try {
      // Load config from file or use individual flags
      let config: any
      if (flags.config) {
        config = readJsonSync(flags.config)
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

      // Use config values
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

      spinner.text = 'Creating distribution...'

      // Create the distribution
      const result = await createDistribution(this.context.umi, {
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
      }).sendAndConfirm(this.context.umi)

      spinner.succeed('Distribution created successfully!')

      // Get the distribution PDA
      const distributionPda = findDistributionPda(this.context.umi, {
        mint,
        seed: seed.publicKey,
      })

      // Display results
      this.log('')
      this.logSuccess(`Distribution created: ${distributionPda}`)
      this.log(`Name: ${config.name}`)
      this.log(`Mint: ${mint}`)
      this.log(`Total Claimants: ${totalClaimants}`)
      this.log(`Tree Height: ${treeHeight}`)
      this.log(`Distribution Type: ${distributionType === DistributionType.Wallet ? 'Wallet' : 'Legacy NFT'}`)
      this.log(`Start Time: ${startTime}`)
      this.log(`End Time: ${endTime}`)
      this.log('')
      this.log(`Transaction: ${txSignatureToString(result.signature)}`)
      this.log('')
      this.log(
        generateExplorerUrl(
          this.context.explorer,
          this.context.chain,
          txSignatureToString(result.signature),
          'transaction'
        )
      )

    } catch (error) {
      spinner.fail('Failed to create distribution')
      throw error
    }
  }
}