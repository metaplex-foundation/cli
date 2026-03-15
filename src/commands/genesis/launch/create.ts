import {
  CreateLaunchInput,
  CreateMemecoinLaunchInput,
  CreateProjectLaunchInput,
  GenesisApiConfig,
  LockedAllocation,
  QuoteMintInput,
  SvmNetwork,
  createAndRegisterLaunch,
} from '@metaplex-foundation/genesis'
import { Flags } from '@oclif/core'
import ora from 'ora'

import { TransactionCommand } from '../../../TransactionCommand.js'
import { generateExplorerUrl } from '../../../explorers.js'
import { readJsonSync } from '../../../lib/file.js'
import { detectSvmNetwork, txSignatureToString } from '../../../lib/util.js'

export default class GenesisLaunchCreate extends TransactionCommand<typeof GenesisLaunchCreate> {
  static override description = `Create a new token launch via the Genesis API.

This is an all-in-one command that:
  1. Calls the Genesis API to build the on-chain transactions
  2. Signs and sends them to the network
  3. Registers the launch on the Metaplex platform

The Genesis API handles creating the genesis account, mint, launch pool bucket,
and optional locked allocations in a single flow.

Launch types:
  - project: Total supply 1B, 48-hour deposit period, configurable allocations.
  - memecoin: Total supply 1B, 1-hour deposit period, hardcoded fund flows. Only --depositStartTime is required.`

  static override examples = [
    '$ mplx genesis launch create --name "My Token" --symbol "MTK" --image "https://gateway.irys.xyz/abc123" --tokenAllocation 500000000 --depositStartTime 2025-03-01T00:00:00Z --raiseGoal 200 --raydiumLiquidityBps 5000 --fundsRecipient <ADDRESS>',
    '$ mplx genesis launch create --launchType memecoin --name "My Meme" --symbol "MEME" --image "https://gateway.irys.xyz/abc123" --depositStartTime 2025-03-01T00:00:00Z',
    '$ mplx genesis launch create --name "My Token" --symbol "MTK" --image "https://gateway.irys.xyz/abc123" --tokenAllocation 500000000 --depositStartTime 2025-03-01T00:00:00Z --raiseGoal 200 --raydiumLiquidityBps 5000 --fundsRecipient <ADDRESS> --lockedAllocations allocations.json',
  ]

  static override flags = {
    // Launch type
    launchType: Flags.option({
      description: 'Launch type: project (default) or memecoin',
      options: ['project', 'memecoin'] as const,
      default: 'project' as const,
    })(),

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

    // Shared config
    depositStartTime: Flags.string({
      description: 'Deposit start time (ISO date string or unix timestamp). Project: 48h deposit. Memecoin: 1h deposit.',
      required: true,
    }),

    // Project-only launchpool config
    tokenAllocation: Flags.integer({
      description: '[project only] Launch pool token allocation (portion of 1B total supply)',
      required: false,
    }),
    raiseGoal: Flags.integer({
      description: '[project only] Raise goal in whole units (e.g., 200 for 200 SOL)',
      required: false,
    }),
    raydiumLiquidityBps: Flags.integer({
      description: '[project only] Raydium liquidity in basis points (2000-10000, i.e. 20%-100%)',
      required: false,
    }),
    fundsRecipient: Flags.string({
      description: '[project only] Funds recipient wallet address',
      required: false,
    }),

    // Optional
    lockedAllocations: Flags.string({
      description: '[project only] Path to JSON file with locked allocation configs',
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

  public async run(): Promise<unknown> {
    const { flags } = await this.parse(GenesisLaunchCreate)

    const isMemecoin = flags.launchType === 'memecoin'

    // Reject project-only flags for memecoin launches
    if (isMemecoin) {
      const disallowed = ['tokenAllocation', 'raiseGoal', 'raydiumLiquidityBps', 'fundsRecipient', 'lockedAllocations'] as const
      const present = disallowed.filter(f => flags[f] !== undefined)
      if (present.length > 0) {
        this.error(`The following flags are not allowed for memecoin launches: ${present.map(f => `--${f}`).join(', ')}`)
      }
    }

    // Validate project-only required flags
    if (!isMemecoin) {
      if (flags.tokenAllocation === undefined || flags.tokenAllocation <= 0) {
        this.error('--tokenAllocation is required for project launches and must be a positive number')
      }
      if (flags.raiseGoal === undefined || flags.raiseGoal <= 0) {
        this.error('--raiseGoal is required for project launches and must be a positive number')
      }
      if (flags.raydiumLiquidityBps === undefined) this.error('--raydiumLiquidityBps is required for project launches')
      if (!flags.fundsRecipient) this.error('--fundsRecipient is required for project launches')

      if (flags.raydiumLiquidityBps < 2000 || flags.raydiumLiquidityBps > 10000) {
        this.error('raydiumLiquidityBps must be between 2000 and 10000 (20%-100%)')
      }
    }

    const spinner = ora('Creating token launch via Genesis API...').start()

    try {
      // Detect network from chain if not specified
      const network: SvmNetwork = flags.network ?? detectSvmNetwork(this.context.chain)

      // Build external links
      const externalLinks: Record<string, string> = {}
      if (flags.website) externalLinks.website = flags.website
      if (flags.twitter) externalLinks.twitter = flags.twitter
      if (flags.telegram) externalLinks.telegram = flags.telegram

      // Build token metadata
      const wallet = this.context.signer.publicKey.toString()
      const token = {
        name: flags.name,
        symbol: flags.symbol,
        image: flags.image,
        ...(flags.description && { description: flags.description }),
        ...(Object.keys(externalLinks).length > 0 && { externalLinks }),
      }

      let input: CreateLaunchInput

      if (isMemecoin) {
        const memecoinInput: CreateMemecoinLaunchInput = {
          wallet,
          token,
          launchType: 'memecoin',
          launch: {
            depositStartTime: flags.depositStartTime,
          },
          network,
          ...(flags.quoteMint !== 'SOL' && { quoteMint: flags.quoteMint as QuoteMintInput }),
        }
        input = memecoinInput
      } else {
        // Parse locked allocations from JSON file if provided
        let lockedAllocations: LockedAllocation[] | undefined
        if (flags.lockedAllocations) {
          lockedAllocations = this.parseLockedAllocations(flags.lockedAllocations)
        }

        const projectInput: CreateProjectLaunchInput = {
          wallet,
          token,
          launchType: 'project',
          launch: {
            launchpool: {
              tokenAllocation: flags.tokenAllocation!,
              depositStartTime: flags.depositStartTime,
              raiseGoal: flags.raiseGoal!,
              raydiumLiquidityBps: flags.raydiumLiquidityBps!,
              fundsRecipient: flags.fundsRecipient!,
            },
            ...(lockedAllocations && { lockedAllocations }),
          },
          network,
          ...(flags.quoteMint !== 'SOL' && { quoteMint: flags.quoteMint as QuoteMintInput }),
        }
        input = projectInput
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

      return {
        genesisAccount: result.genesisAccount,
        mintAddress: result.mintAddress,
        launchId: result.launch.id,
        launchLink: result.launch.link,
        signatures: result.signatures.map((sig: Uint8Array) => {
          const sigStr = txSignatureToString(sig)
          return { signature: sigStr, explorer: generateExplorerUrl(this.context.explorer, this.context.chain, sigStr, 'transaction') }
        }),
      }
    } catch (error) {
      spinner.fail('Failed to create token launch')
      if (error && typeof error === 'object' && 'responseBody' in error) {
        this.logJson((error as { responseBody: unknown }).responseBody)
      }

      throw error
    }
  }

  private parseLockedAllocations(filePath: string): LockedAllocation[] {
    let parsed: unknown
    try {
      parsed = readJsonSync(filePath)
    } catch (err) {
      if (err && typeof err === 'object' && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`Locked allocations file not found: ${filePath}`)
      }
      throw err
    }

    if (!Array.isArray(parsed)) {
      throw new Error('Locked allocations file must contain a JSON array')
    }

    const validTimeUnits = new Set(['SECOND', 'MINUTE', 'HOUR', 'DAY', 'WEEK', 'TWO_WEEKS', 'MONTH', 'QUARTER', 'YEAR'])
    for (let i = 0; i < parsed.length; i++) {
      const entry = parsed[i]
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        throw new Error(`Locked allocation [${i}]: entry must be an object`)
      }
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
      if (entry.cliff !== undefined) {
        if (typeof entry.cliff !== 'object' || entry.cliff === null) {
          throw new Error(`Locked allocation [${i}]: "cliff" must be an object`)
        }
        if (!entry.cliff.duration || typeof entry.cliff.duration.value !== 'number' || !validTimeUnits.has(entry.cliff.duration.unit)) {
          throw new Error(`Locked allocation [${i}]: "cliff.duration" must have a numeric "value" and a valid "unit"`)
        }
        if (entry.cliff.unlockAmount !== undefined && (typeof entry.cliff.unlockAmount !== 'number' || entry.cliff.unlockAmount < 0)) {
          throw new Error(`Locked allocation [${i}]: "cliff.unlockAmount" must be a non-negative number`)
        }
      }
    }

    return parsed as LockedAllocation[]
  }
}
