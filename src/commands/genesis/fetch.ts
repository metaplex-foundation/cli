import {
  safeFetchGenesisAccountV2,
} from '@metaplex-foundation/genesis'
import { publicKey } from '@metaplex-foundation/umi'
import { Args } from '@oclif/core'
import ora from 'ora'

import { BaseCommand } from '../../BaseCommand.js'
import { generateExplorerUrl } from '../../explorers.js'
import { KEY_TYPES, FUNDING_MODES } from '../../lib/genesis.js'

export default class GenesisFetch extends BaseCommand<typeof GenesisFetch> {
  static override description = `Fetch a Genesis account by its address.

This command retrieves and displays information about an existing Genesis account.
Use this to check the status, configuration, and details of any Genesis launch.`

  static override examples = [
    '$ mplx genesis fetch GenesisAddress123...',
    '$ mplx genesis fetch 7nVDaSFJWnPpBXH5JQxUvK8YwMGp5VHrYLBhWAe5hJkv',
  ]

  static override usage = 'genesis fetch [GENESIS]'

  static override args = {
    genesis: Args.string({
      description: 'The Genesis account address to fetch',
      required: true,
    }),
  }

  public async run(): Promise<void> {
    const { args } = await this.parse(GenesisFetch)
    const spinner = ora('Fetching Genesis account...').start()

    try {
      const genesisAddress = publicKey(args.genesis)

      const genesisAccount = await safeFetchGenesisAccountV2(this.context.umi, genesisAddress)

      if (!genesisAccount) {
        spinner.fail('Genesis account not found')
        this.error(`Genesis account not found at address: ${args.genesis}`)
      }

      spinner.succeed('Genesis account fetched successfully!')

      this.log('')
      this.logSuccess(`Genesis Account: ${genesisAddress}`)
      this.log('')
      this.log('Account Details:')
      this.log(`  Account Type: ${KEY_TYPES[genesisAccount.key] || 'Unknown'}`)
      this.log(`  Authority: ${genesisAccount.authority}`)
      this.log(`  Base Mint: ${genesisAccount.baseMint}`)
      this.log(`  Quote Mint: ${genesisAccount.quoteMint}`)
      this.log(`  Finalized: ${genesisAccount.finalized ? 'Yes' : 'No'}`)
      this.log(`  Index: ${genesisAccount.index}`)
      this.log(`  Bucket Count: ${genesisAccount.bucketCount}`)
      this.log('')
      this.log('Token Supply:')
      this.log(`  Total Supply (Base Token): ${genesisAccount.totalSupplyBaseToken.toString()}`)
      this.log(`  Total Allocated Supply: ${genesisAccount.totalAllocatedSupplyBaseToken.toString()}`)
      this.log(`  Unallocated Supply: ${(genesisAccount.totalSupplyBaseToken - genesisAccount.totalAllocatedSupplyBaseToken).toString()}`)
      this.log('')
      this.log('Proceeds:')
      this.log(`  Total Proceeds (Quote Token): ${genesisAccount.totalProceedsQuoteToken.toString()}`)
      this.log('')
      this.log('Configuration:')
      this.log(`  Funding Mode: ${FUNDING_MODES[genesisAccount.fundingMode] || `Unknown (${genesisAccount.fundingMode})`}`)
      this.log(`  Bump: ${genesisAccount.bump}`)
      this.log('')
      this.log('View on Explorer:')
      this.log(
        generateExplorerUrl(
          this.context.explorer,
          this.context.chain,
          genesisAddress,
          'account'
        )
      )
    } catch (error) {
      spinner.fail('Failed to fetch Genesis account')
      if (error instanceof Error && error.message.includes('Account does not exist')) {
        this.error(`Genesis account not found at address: ${args.genesis}`)
      }
      throw error
    }
  }
}
