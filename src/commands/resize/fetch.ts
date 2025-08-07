import {
  fetchDistribution,
  DistributionType,
  AllowedDistributor,
} from '@metaplex-foundation/mpl-distro-resize'
import {publicKey} from '@metaplex-foundation/umi'
import {base58} from '@metaplex-foundation/umi/serializers'
import {Args} from '@oclif/core'
import ora from 'ora'

import {TransactionCommand} from '../../TransactionCommand.js'
import {generateExplorerUrl} from '../../explorers.js'

export default class ResizeFetch extends TransactionCommand<typeof ResizeFetch> {
  static override description = `Fetch a token distribution by its address.

This command retrieves and displays information about an existing distribution created with MPL Distro.
You can use this to check the status, configuration, and details of any distribution.`

  static override examples = [
    '$ mplx resize fetch DistroAddress123...',
    '$ mplx resize fetch 7nVDaSFJWnPpBXH5JQxUvK8YwMGp5VHrYLBhWAe5hJkv',
  ]

  static override usage = 'resize fetch [DISTRIBUTION]'

  static override args = {
    distribution: Args.string({
      description: 'The distribution address to fetch',
      required: true,
    }),
  }

  public async run(): Promise<void> {
    const {args} = await this.parse(ResizeFetch)
    const spinner = ora('Fetching distribution...').start()

    try {
      const distributionAddress = publicKey(args.distribution)
      
      const distribution = await fetchDistribution(this.context.umi, distributionAddress)

      spinner.succeed('Distribution fetched successfully!')

      this.log('')
      this.logSuccess(`Distribution: ${distributionAddress}`)
      this.log('')
      this.log('Distribution Details:')
      this.log(`  Name: ${distribution.name}`)
      this.log(`  Authority: ${distribution.authority}`)
      this.log(`  Mint: ${distribution.mint}`)
      this.log(`  Total Claimants: ${distribution.totalClaimants}`)
      this.log(`  Tree Height: ${distribution.treeHeight}`)
      
      const distributionType = distribution.distributionType === DistributionType.Wallet ? 'Wallet' : 'Legacy NFT'
      this.log(`  Distribution Type: ${distributionType}`)
      
      const allowedDistributor = distribution.allowedDistributor === AllowedDistributor.Permissionless 
        ? 'Permissionless' 
        : 'Recipient'
      this.log(`  Allowed Distributor: ${allowedDistributor}`)
      
      this.log(`  Subsidize Receipts: ${distribution.subsidizeReceipts}`)
      
      const startTime = new Date(Number(distribution.startTime) * 1000)
      const endTime = new Date(Number(distribution.endTime) * 1000)
      const now = new Date()
      
      this.log(`  Start Time: ${startTime.toISOString()} (${startTime.toLocaleString()})`)
      this.log(`  End Time: ${endTime.toISOString()} (${endTime.toLocaleString()})`)
      
      let status = 'Not Started'
      if (now >= startTime && now <= endTime) {
        status = 'Active'
      } else if (now > endTime) {
        status = 'Ended'
      }
      this.log(`  Status: ${status}`)
      
      this.log(`  Merkle Root: ${base58.deserialize(distribution.merkleRoot)[0]}`)
      
      this.log('')
      this.log('View on Explorer:')
      this.log(
        generateExplorerUrl(
          this.context.explorer,
          this.context.chain,
          distributionAddress,
          'account',
        ),
      )
    } catch (error) {
      spinner.fail('Failed to fetch distribution')
      if (error instanceof Error && error.message.includes('Account does not exist')) {
        this.error(`Distribution not found at address: ${args.distribution}`)
      }
      throw error
    }
  }
}