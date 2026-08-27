import {
  fetchDistribution,
  DistributionType,
  AllowedDistributor,
} from '@metaplex-foundation/mpl-distro'
import {fetchMint} from '@metaplex-foundation/mpl-toolbox'
import {publicKey} from '@metaplex-foundation/umi'
import {base58} from '@metaplex-foundation/umi/serializers'
import {Args} from '@oclif/core'
import ora from 'ora'

import {BaseCommand} from '../../BaseCommand.js'
import {generateExplorerUrl} from '../../explorers.js'

const decodeDistributionName = (name: Uint8Array | string): string => {
  if (typeof name === 'string') {
    return name.replace(/\0+$/, '')
  }

  const end = name.indexOf(0)
  return new TextDecoder().decode(end === -1 ? name : name.subarray(0, end))
}

const formatTokenAmount = (basisAmount: bigint | number, decimals: number): string => {
  const basis = BigInt(basisAmount)
  const divisor = 10n ** BigInt(decimals)
  const whole = basis / divisor
  const frac = basis % divisor
  if (frac === 0n) {
    return whole.toString()
  }

  return `${whole}.${frac.toString().padStart(decimals, '0').replace(/0+$/, '')}`
}

const allowedDistributorLabel = (allowedDistributor: AllowedDistributor): string => {
  switch (allowedDistributor) {
    case AllowedDistributor.Permissionless:
      return 'Permissionless'
    case AllowedDistributor.Permissioned:
      return 'Permissioned'
    default:
      return 'Recipient'
  }
}

export default class DistroFetch extends BaseCommand<typeof DistroFetch> {
  static override description = `Fetch a token distribution by its address.

This command retrieves and displays information about an existing distribution created with MPL Distro.
You can use this to check the status, configuration, and details of any distribution.`

  static override examples = [
    '$ mplx distro fetch DistroAddress123...',
    '$ mplx distro fetch 7nVDaSFJWnPpBXH5JQxUvK8YwMGp5VHrYLBhWAe5hJkv',
  ]

  static override usage = 'distro fetch [DISTRIBUTION]'

  static override args = {
    distribution: Args.string({
      description: 'The distribution address to fetch',
      required: true,
    }),
  }

  public async run(): Promise<unknown> {
    const {args} = await this.parse(DistroFetch)
    const spinner = ora('Fetching distribution...').start()

    try {
      const distributionAddress = publicKey(args.distribution)

      const distribution = await fetchDistribution(this.context.umi, distributionAddress)

      let decimals: number | null = null
      try {
        const mintAccount = await fetchMint(this.context.umi, distribution.mint)
        decimals = mintAccount.decimals
      } catch {
        // Fall back to base units when the mint cannot be fetched.
      }

      spinner.succeed('Distribution fetched successfully!')

      const distributionType = distribution.distributionType === DistributionType.Wallet ? 'Wallet' : 'Legacy NFT'
      const allowedDistributor = allowedDistributorLabel(distribution.allowedDistributor)
      const startTime = new Date(Number(distribution.startTime) * 1000)
      const endTime = new Date(Number(distribution.endTime) * 1000)
      const now = new Date()
      let status = 'Not Started'
      if (now >= startTime && now <= endTime) {
        status = 'Active'
      } else if (now > endTime) {
        status = 'Ended'
      }
      const merkleRoot = base58.deserialize(distribution.merkleRoot)[0]
      const name = decodeDistributionName(distribution.name)
      const totalAmountTokens = decimals === null ? null : formatTokenAmount(distribution.totalAmount, decimals)
      const claimAmountTokens = decimals === null ? null : formatTokenAmount(distribution.claimAmount, decimals)
      const totalAmountDisplay = totalAmountTokens === null
        ? `${distribution.totalAmount} basis`
        : `${totalAmountTokens} tokens (${distribution.totalAmount} basis)`
      const claimAmountDisplay = claimAmountTokens === null
        ? `${distribution.claimAmount} basis`
        : `${claimAmountTokens} tokens (${distribution.claimAmount} basis)`

      this.log('')
      this.logSuccess(`Distribution: ${distributionAddress}`)
      this.log('')
      this.log('Distribution Details:')
      this.log(`  Name: ${name}`)
      this.log(`  Authority: ${distribution.authority}`)
      this.log(`  Mint: ${distribution.mint}`)
      this.log(`  Total Claimants: ${distribution.totalClaimants}`)
      this.log(`  Tree Height: ${distribution.treeHeight}`)
      this.log(`  Distribution Type: ${distributionType}`)
      this.log(`  Allowed Distributor: ${allowedDistributor}`)
      if (distribution.allowedDistributor === AllowedDistributor.Permissioned) {
        this.log(`  Permissioned Distributor: ${distribution.permissionedDistributor}`)
      }
      this.log(`  Total Amount: ${totalAmountDisplay}`)
      this.log(`  Claim Amount: ${claimAmountDisplay}`)
      this.log(`  Claim Count: ${distribution.claimCount}`)
      this.log(`  Subsidize Receipts: ${distribution.subsidizeReceipts}`)
      this.log(`  Start Time: ${startTime.toISOString()} (${startTime.toLocaleString()})`)
      this.log(`  End Time: ${endTime.toISOString()} (${endTime.toLocaleString()})`)
      this.log(`  Status: ${status}`)
      this.log(`  Merkle Root: ${merkleRoot}`)
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

      return {
        address: distributionAddress.toString(),
        name,
        authority: distribution.authority.toString(),
        mint: distribution.mint.toString(),
        totalClaimants: Number(distribution.totalClaimants),
        treeHeight: distribution.treeHeight,
        distributionType,
        allowedDistributor,
        permissionedDistributor:
          distribution.allowedDistributor === AllowedDistributor.Permissioned
            ? distribution.permissionedDistributor.toString()
            : undefined,
        totalAmount: totalAmountTokens ?? distribution.totalAmount.toString(),
        totalAmountBasis: distribution.totalAmount.toString(),
        claimAmount: claimAmountTokens ?? distribution.claimAmount.toString(),
        claimAmountBasis: distribution.claimAmount.toString(),
        claimCount: Number(distribution.claimCount),
        subsidizeReceipts: distribution.subsidizeReceipts,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        status,
        merkleRoot,
        explorer: generateExplorerUrl(this.context.explorer, this.context.chain, distributionAddress, 'account'),
      }
    } catch (error) {
      spinner.fail('Failed to fetch distribution')
      if (error instanceof Error && error.message.includes('Account does not exist')) {
        this.error(`Distribution not found at address: ${args.distribution}`)
      }
      throw error
    }
  }
}
