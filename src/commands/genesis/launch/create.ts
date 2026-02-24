import {
  CreateLaunchInput,
  GenesisApiConfig,
  LockedAllocation,
  SvmNetwork,
  createAndRegisterLaunch,
} from '@metaplex-foundation/genesis'
import { Flags } from '@oclif/core'
import { existsSync } from 'node:fs'
import ora from 'ora'

import { TransactionCommand } from '../../../TransactionCommand.js'
import { generateExplorerUrl } from '../../../explorers.js'
import { readJsonSync } from '../../../lib/file.js'
import { RpcChain, txSignatureToString } from '../../../lib/util.js'

export default class GenesisLaunchCreate extends TransactionCommand<typeof GenesisLaunchCreate> {
  static override description = `Create a new token launch via the Genesis API.

This is an all-in-one command that:
  1. Calls the Genesis API to build the on-chain transactions
  2. Signs and sends them to the network
  3. Registers the launch on the Metaplex platform

The Genesis API handles creating the genesis account, mint, launch pool bucket,
and optional locked allocations in a single flow.

Total token supply is fixed at 1,000,000,000. The deposit period is 48 hours.`

  static override examples = [
    '$ mplx genesis launch create --name "My Token" --symbol "MTK" --image "https://gateway.irys.xyz/abc123" --tokenAllocation 500000000 --depositStartTime 2025-03-01T00:00:00Z --raiseGoal 200 --raydiumLiquidityBps 5000 --fundsRecipient <ADDRESS>',
    '$ mplx genesis launch create --name "My Token" --symbol "MTK" --image "https://gateway.irys.xyz/abc123" --tokenAllocation 500000000 --depositStartTime 1709251200 --raiseGoal 200 --raydiumLiquidityBps 5000 --fundsRecipient <ADDRESS> --quoteMint USDC',
    '$ mplx genesis launch create --name "My Token" --symbol "MTK" --image "https://gateway.irys.xyz/abc123" --tokenAllocation 500000000 --depositStartTime 2025-03-01T00:00:00Z --raiseGoal 200 --raydiumLiquidityBps 5000 --fundsRecipient <ADDRESS> --lockedAllocations allocations.json',
  ]

  static override flags = {
    // Token metadata
    name: Flags.string({
      char: 'n',
      description: 'Name of the token (1-32 characters)',
      required: true,
    }),
    symbol: Flags.string({
      char: 's',
      description: 'Symbol of the token (1-10 characters)',
      required: true,
    }),
    image: Flags.string({
      description: 'Token image URL (must start with https://gateway.irys.xyz/)',
      required: true,
    }),
    description: Flags.string({
      description: 'Token description (max 250 characters)',
      required: false,
    }),
    website: Flags.string({
      description: 'Project website URL',
      required: false,
    }),
    twitter: Flags.string({
      description: 'Project Twitter URL',
      required: false,
    }),
    telegram: Flags.string({
      description: 'Project Telegram URL',
      required: false,
    }),

    // Launchpool config
    tokenAllocation: Flags.integer({
      description: 'Launch pool token allocation (portion of 1B total supply)',
      required: true,
    }),
    depositStartTime: Flags.string({
      description: 'Deposit start time (ISO date string or unix timestamp). Deposit period is 48 hours.',
      required: true,
    }),
    raiseGoal: Flags.integer({
      description: 'Raise goal in whole units (e.g., 200 for 200 SOL)',
      required: true,
    }),
    raydiumLiquidityBps: Flags.integer({
      description: 'Raydium liquidity in basis points (2000-10000, i.e. 20%-100%)',
      required: true,
    }),
    fundsRecipient: Flags.string({
      description: 'Funds recipient wallet address',
      required: true,
    }),

    // Optional
    lockedAllocations: Flags.string({
      description: 'Path to JSON file with locked allocation configs',
      required: false,
    }),
    quoteMint: Flags.string({
      description: 'Quote mint: SOL (default), USDC, or a mint address',
      default: 'SOL',
    }),
    network: Flags.option({
      description: 'Network override (auto-detected from RPC if not set)',
      options: ['solana-mainnet', 'solana-devnet'] as const,
      required: false,
    })(),
    apiUrl: Flags.string({
      description: 'Genesis API base URL',
      default: 'https://api.metaplex.com',
      required: false,
    }),
  }

  static override usage = 'genesis launch create [FLAGS]'

  public async run(): Promise<void> {
    const { flags } = await this.parse(GenesisLaunchCreate)

    const spinner = ora('Creating token launch via Genesis API...').start()

    try {
      // Detect network from chain if not specified
      let network: SvmNetwork
      if (flags.network) {
        network = flags.network
      } else {
        network = this.context.chain === RpcChain.Mainnet
          ? 'solana-mainnet'
          : 'solana-devnet'
      }

      // Parse locked allocations from JSON file if provided
      let lockedAllocations: LockedAllocation[] | undefined
      if (flags.lockedAllocations) {
        const filePath = flags.lockedAllocations
        if (!existsSync(filePath)) {
          throw new Error(`Locked allocations file not found: ${filePath}`)
        }

        const parsed = readJsonSync(filePath)

        if (!Array.isArray(parsed)) {
          throw new Error('Locked allocations file must contain a JSON array')
        }

        const validTimeUnits = new Set(['SECOND', 'MINUTE', 'HOUR', 'DAY', 'WEEK', 'TWO_WEEKS', 'MONTH', 'QUARTER', 'YEAR'])
        for (let i = 0; i < parsed.length; i++) {
          const entry = parsed[i]
          if (typeof entry.name !== 'string' || entry.name.length === 0) {
            throw new Error(`Locked allocation [${i}]: "name" must be a non-empty string`)
          }
          if (typeof entry.recipient !== 'string' || entry.recipient.length === 0) {
            throw new Error(`Locked allocation [${i}]: "recipient" must be a non-empty string`)
          }
          if (typeof entry.tokenAmount !== 'number' || entry.tokenAmount <= 0) {
            throw new Error(`Locked allocation [${i}]: "tokenAmount" must be a positive number`)
          }
          if (typeof entry.vestingStartTime !== 'string' || entry.vestingStartTime.length === 0) {
            throw new Error(`Locked allocation [${i}]: "vestingStartTime" must be a non-empty date string`)
          }
          if (!entry.vestingDuration || typeof entry.vestingDuration.value !== 'number' || !validTimeUnits.has(entry.vestingDuration.unit)) {
            throw new Error(`Locked allocation [${i}]: "vestingDuration" must have a numeric "value" and a valid "unit"`)
          }
          if (!validTimeUnits.has(entry.unlockSchedule)) {
            throw new Error(`Locked allocation [${i}]: "unlockSchedule" must be a valid time unit`)
          }
        }

        lockedAllocations = parsed as LockedAllocation[]
      }

      // Build external links
      const externalLinks: Record<string, string> = {}
      if (flags.website) externalLinks.website = flags.website
      if (flags.twitter) externalLinks.twitter = flags.twitter
      if (flags.telegram) externalLinks.telegram = flags.telegram

      // Build input
      const wallet = this.context.signer.publicKey.toString()

      const input: CreateLaunchInput = {
        wallet,
        token: {
          name: flags.name,
          symbol: flags.symbol,
          image: flags.image,
          ...(flags.description && { description: flags.description }),
          ...(Object.keys(externalLinks).length > 0 && { externalLinks }),
        },
        launchType: 'project',
        launch: {
          launchpool: {
            tokenAllocation: flags.tokenAllocation,
            depositStartTime: flags.depositStartTime,
            raiseGoal: flags.raiseGoal,
            raydiumLiquidityBps: flags.raydiumLiquidityBps,
            fundsRecipient: flags.fundsRecipient,
          },
          ...(lockedAllocations && { lockedAllocations }),
        },
        network,
        quoteMint: flags.quoteMint,
      }

      const apiConfig: GenesisApiConfig = {
        baseUrl: flags.apiUrl,
      }

      spinner.text = 'Building transactions via Genesis API...'

      const allowedCommitments = ['processed', 'confirmed', 'finalized'] as const
      const commitment = allowedCommitments.includes(this.context.commitment as typeof allowedCommitments[number])
        ? (this.context.commitment as typeof allowedCommitments[number])
        : 'confirmed'

      const result = await createAndRegisterLaunch(
        this.context.umi,
        apiConfig,
        input,
        { commitment },
      )

      spinner.succeed('Token launch created and registered successfully!')

      this.log('')
      this.logSuccess(`Genesis Account: ${result.genesisAccount}`)
      this.log(`Mint Address: ${result.mintAddress}`)
      this.log(`Launch ID: ${result.launch.id}`)
      this.log(`Launch Link: ${result.launch.link}`)
      this.log(`Token ID: ${result.token.id}`)
      this.log('')
      this.log('Transactions:')
      for (const sig of result.signatures) {
        const sigStr = txSignatureToString(sig)
        this.log(`  ${sigStr}`)
        this.log(
          `  ${generateExplorerUrl(
            this.context.explorer,
            this.context.chain,
            sigStr,
            'transaction',
          )}`,
        )
      }

      this.log('')
      this.log('Your token launch is live! Share the launch link with your community.')
    } catch (error) {
      spinner.fail('Failed to create token launch')
      if (error && typeof error === 'object' && 'responseBody' in error) {
        this.logJson((error as { responseBody: unknown }).responseBody)
      }

      throw error
    }
  }
}
