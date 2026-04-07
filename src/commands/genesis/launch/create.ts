import {
  CreateBondingCurveLaunchInput,
  CreateLaunchInput,
  CreateLaunchpoolLaunchInput,
  GenesisApiConfig,
  LockedAllocation,
  QuoteMintInput,
  SvmNetwork,
  createAndRegisterLaunch,
} from '@metaplex-foundation/genesis'
import { isPublicKey } from '@metaplex-foundation/umi'
import { Flags } from '@oclif/core'
import ora from 'ora'

import { TransactionCommand } from '../../../TransactionCommand.js'
import { generateExplorerUrl } from '../../../explorers.js'
import { readJsonSync } from '../../../lib/file.js'
import { detectSvmNetwork, txSignatureToString } from '../../../lib/util.js'
import { promptLaunchWizard, toISOTimestamp } from '../../../lib/genesis/createGenesisWizardPrompt.js'
import { buildLaunchInput } from '../../../lib/genesis/launchApi.js'

/* ------------------------------------------------------------------ */
/*  Launch strategy types & implementations                            */
/* ------------------------------------------------------------------ */

interface CommonLaunchParams {
  wallet: string
  token: {
    name: string
    symbol: string
    image: string
    description?: string
    externalLinks?: Record<string, string>
  }
  network: SvmNetwork
  quoteMint?: QuoteMintInput
  agent?: {
    mint: string
    setToken: boolean
  }
}

interface LaunchStrategy {
  requiredFlags: string[]
  disallowedFlags: string[]
  validate(flags: Record<string, unknown>): string[]
  buildInput(common: CommonLaunchParams, flags: Record<string, unknown>): CreateLaunchInput
}

const LAUNCH_STRATEGIES: Record<string, LaunchStrategy> = {
  'launchpool': {
    requiredFlags: ['tokenAllocation', 'raiseGoal', 'raydiumLiquidityBps', 'fundsRecipient'],
    disallowedFlags: ['creatorFeeWallet', 'firstBuyAmount'],

    validate(flags) {
      const errors: string[] = []
      if (typeof flags.tokenAllocation === 'number' && flags.tokenAllocation <= 0) {
        errors.push('--tokenAllocation must be a positive number')
      }
      if (typeof flags.raiseGoal === 'number' && flags.raiseGoal <= 0) {
        errors.push('--raiseGoal must be a positive number')
      }
      if (typeof flags.raydiumLiquidityBps === 'number' &&
          (flags.raydiumLiquidityBps < 2000 || flags.raydiumLiquidityBps > 10000)) {
        errors.push('--raydiumLiquidityBps must be between 2000 and 10000 (20%-100%)')
      }
      if (typeof flags.fundsRecipient === 'string' && !isPublicKey(flags.fundsRecipient)) {
        errors.push('--fundsRecipient must be a valid public key')
      }
      return errors
    },

    buildInput(common, flags): CreateLaunchpoolLaunchInput {
      let lockedAllocations: LockedAllocation[] | undefined
      if (typeof flags.lockedAllocations === 'string') {
        lockedAllocations = parseLockedAllocations(flags.lockedAllocations)
      }

      return {
        ...common,
        launchType: 'launchpool',
        launch: {
          launchpool: {
            tokenAllocation: flags.tokenAllocation as number,
            depositStartTime: flags.depositStartTime as string,
            raiseGoal: flags.raiseGoal as number,
            raydiumLiquidityBps: flags.raydiumLiquidityBps as number,
            fundsRecipient: flags.fundsRecipient as string,
          },
          ...(lockedAllocations && { lockedAllocations }),
        },
      }
    },
  },

  'bonding-curve': {
    requiredFlags: [],
    disallowedFlags: ['tokenAllocation', 'raiseGoal', 'raydiumLiquidityBps', 'fundsRecipient', 'lockedAllocations', 'depositStartTime'],

    validate(flags) {
      const errors: string[] = []
      if (typeof flags.creatorFeeWallet === 'string' && !isPublicKey(flags.creatorFeeWallet)) {
        errors.push('--creatorFeeWallet must be a valid public key')
      }
      if (typeof flags.firstBuyAmount === 'number' && flags.firstBuyAmount < 0) {
        errors.push('--firstBuyAmount must be non-negative')
      }
      return errors
    },

    buildInput(common, flags): CreateBondingCurveLaunchInput {
      return {
        ...common,
        launchType: 'bondingCurve',
        launch: {
          ...(typeof flags.creatorFeeWallet === 'string' && { creatorFeeWallet: flags.creatorFeeWallet }),
          ...(typeof flags.firstBuyAmount === 'number' && flags.firstBuyAmount > 0 && { firstBuyAmount: flags.firstBuyAmount }),
        },
      }
    },
  },
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function parseLockedAllocations(filePath: string): LockedAllocation[] {
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
    if (typeof entry.recipient !== 'string' || !isPublicKey(entry.recipient)) {
      throw new Error(`Locked allocation [${i}]: "recipient" must be a valid public key`)
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

/* ------------------------------------------------------------------ */
/*  Command                                                            */
/* ------------------------------------------------------------------ */

export default class GenesisLaunchCreate extends TransactionCommand<typeof GenesisLaunchCreate> {
  static override description = `Create a new token launch via the Genesis API.

This is an all-in-one command that:
  1. Calls the Genesis API to build the on-chain transactions
  2. Signs and sends them to the network
  3. Registers the launch on the Metaplex platform

The Genesis API handles creating the genesis account, mint, launch pool bucket,
and optional locked allocations in a single flow.

Supports two launch types:
  - launchpool: Project-style launch with deposit period, raise goal, and Raydium LP
  - bonding-curve: Instant bonding curve launch with optional first buy and creator fees

Agent mode (--agentMint) wraps transactions for execution by an on-chain agent,
enabling AI agents to launch tokens autonomously.

Use --wizard for an interactive guided setup.`

  static override examples = [
    '$ mplx genesis launch create --wizard',
    '$ mplx genesis launch create --name "My Token" --symbol "MTK" --image "https://gateway.irys.xyz/abc123" --tokenAllocation 500000000 --depositStartTime 2025-03-01T00:00:00Z --raiseGoal 200 --raydiumLiquidityBps 5000 --fundsRecipient <ADDRESS>',
    '$ mplx genesis launch create --launchType bonding-curve --name "My Meme" --symbol "MEME" --image "https://gateway.irys.xyz/abc123"',
    '$ mplx genesis launch create --launchType bonding-curve --name "My Meme" --symbol "MEME" --image "https://gateway.irys.xyz/abc123" --creatorFeeWallet <ADDRESS> --firstBuyAmount 0.1',
    '$ mplx genesis launch create --launchType bonding-curve --name "Agent Token" --symbol "AGT" --image "https://gateway.irys.xyz/abc123" --agentMint <AGENT_NFT_ADDRESS> --agentSetToken',
    '$ mplx genesis launch create --name "My Token" --symbol "MTK" --image "https://gateway.irys.xyz/abc123" --tokenAllocation 500000000 --depositStartTime 2025-03-01T00:00:00Z --raiseGoal 200 --raydiumLiquidityBps 5000 --fundsRecipient <ADDRESS> --lockedAllocations allocations.json',
  ]

  static override flags = {
    // Wizard mode
    wizard: Flags.boolean({
      description: 'Interactive guided setup wizard',
      default: false,
    }),

    // Launch type
    launchType: Flags.option({
      description: 'Launch type: launchpool (default) or bonding-curve',
      options: ['launchpool', 'bonding-curve'] as const,
      default: 'launchpool' as const,
    })(),

    // Token metadata
    name: Flags.string({
      char: 'n',
      description: 'Name of the token (1-32 characters)',
      required: false,
    }),
    symbol: Flags.string({
      char: 's',
      description: 'Symbol of the token (1-10 characters)',
      required: false,
    }),
    image: Flags.string({
      description: 'Token image URL (must start with https://gateway.irys.xyz/)',
      required: false,
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
      description: '[launchpool only] Deposit start time (ISO date string or unix timestamp). 48h deposit period.',
      required: false,
    }),

    // Project-only launchpool config
    tokenAllocation: Flags.integer({
      description: '[launchpool only] Launch pool token allocation (portion of 1B total supply)',
      required: false,
    }),
    raiseGoal: Flags.integer({
      description: '[launchpool only] Raise goal in whole units (e.g., 200 for 200 SOL)',
      required: false,
    }),
    raydiumLiquidityBps: Flags.integer({
      description: '[launchpool only] Raydium liquidity in basis points (2000-10000, i.e. 20%-100%)',
      required: false,
    }),
    fundsRecipient: Flags.string({
      description: '[launchpool only] Funds recipient wallet address',
      required: false,
    }),

    // Bonding curve config
    creatorFeeWallet: Flags.string({
      description: '[bonding-curve only] Wallet address to receive creator fees (defaults to launching wallet)',
      required: false,
    }),
    firstBuyAmount: Flags.string({
      description: '[bonding-curve only] SOL amount for mandatory first buy (e.g. 0.1 for 0.1 SOL). Omit to disable.',
      required: false,
    }),

    // Agent mode
    agentMint: Flags.string({
      description: 'Agent NFT mint address. Wraps transactions for agent execution, enabling AI agents to launch tokens.',
      required: false,
    }),
    agentSetToken: Flags.boolean({
      description: 'When using --agentMint, set the launched token on the agent NFT.',
      default: false,
    }),

    // Optional
    lockedAllocations: Flags.string({
      description: '[launchpool only] Path to JSON file with locked allocation configs',
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

    if (flags.wizard) {
      return this.runWizard(flags)
    }

    // Non-wizard mode: validate required flags
    const missingFlags = (['name', 'symbol', 'image'] as const).filter(f => !flags[f])
    if (missingFlags.length > 0) {
      this.error(`Missing required flag${missingFlags.length > 1 ? 's' : ''}: ${missingFlags.map(f => `--${f}`).join(', ')}. Use --wizard for interactive setup.`)
    }

    // depositStartTime is required for launchpool only
    if (flags.launchType === 'launchpool' && !flags.depositStartTime) {
      this.error('Missing required flag: --depositStartTime. Required for launchpool launches.')
    }

    // Normalize depositStartTime to ISO string for the SDK (accepts Date | string)
    const flagRecord: Record<string, unknown> = { ...flags }
    if (flags.depositStartTime) {
      try {
        flagRecord.depositStartTime = toISOTimestamp(flags.depositStartTime)
      } catch {
        this.error('--depositStartTime must be a valid ISO date (e.g. 2025-06-01T00:00:00Z) or unix timestamp')
      }
    }

    // Parse firstBuyAmount as a number
    if (flags.firstBuyAmount) {
      const amount = Number(flags.firstBuyAmount)
      if (isNaN(amount) || amount < 0) {
        this.error('--firstBuyAmount must be a non-negative number (e.g. 0.1)')
      }
      flagRecord.firstBuyAmount = amount
    }

    const strategy = LAUNCH_STRATEGIES[flags.launchType]

    // Reject disallowed flags
    const present = strategy.disallowedFlags.filter(f => flagRecord[f] !== undefined)
    if (present.length > 0) {
      this.error(`Flags not allowed for ${flags.launchType} launches: ${present.map(f => `--${f}`).join(', ')}`)
    }

    // Check required flags
    const missing = strategy.requiredFlags.filter(f => flagRecord[f] === undefined)
    if (missing.length > 0) {
      this.error(`Flags required for ${flags.launchType} launches: ${missing.map(f => `--${f}`).join(', ')}`)
    }

    // Type-specific validation
    const errors = strategy.validate(flagRecord)
    if (errors.length > 0) {
      this.error(errors.join('\n'))
    }

    // Validate agent flags
    if (flags.agentMint && !isPublicKey(flags.agentMint)) {
      this.error('--agentMint must be a valid public key (agent NFT mint address)')
    }
    if (flags.agentSetToken && !flags.agentMint) {
      this.error('--agentSetToken requires --agentMint')
    }

    // Detect network from chain if not specified
    const network: SvmNetwork = flags.network ?? detectSvmNetwork(this.context.chain)

    // Build external links
    const externalLinks: Record<string, string> = {}
    if (flags.website) externalLinks.website = flags.website
    if (flags.twitter) externalLinks.twitter = flags.twitter
    if (flags.telegram) externalLinks.telegram = flags.telegram

    // Build common params shared by all launch types
    // Safe to assert — validated above
    const name = flags.name!
    const symbol = flags.symbol!
    const image = flags.image!

    const common: CommonLaunchParams = {
      wallet: this.context.umi.identity.publicKey.toString(),
      token: {
        name,
        symbol,
        image,
        ...(flags.description && { description: flags.description }),
        ...(Object.keys(externalLinks).length > 0 && { externalLinks }),
      },
      network,
      ...(flags.quoteMint !== 'SOL' && { quoteMint: flags.quoteMint as QuoteMintInput }),
      ...(flags.agentMint && {
        agent: {
          mint: flags.agentMint,
          setToken: flags.agentSetToken,
        },
      }),
    }

    const launchInput = strategy.buildInput(common, flagRecord)

    return this.sendLaunch(launchInput, flags.apiUrl)
  }

  /* ------------------------------------------------------------------ */
  /*  Wizard                                                             */
  /* ------------------------------------------------------------------ */

  private async runWizard(flags: Record<string, unknown>): Promise<unknown> {
    this.log('')
    this.log('============================================')
    this.log('  Genesis Launch Wizard')
    this.log('============================================')
    this.log('')
    this.log('This wizard will guide you through creating a token launch via the Genesis API.')
    this.log('Type "q" at any prompt to abort.')
    this.log('')

    const wizardResult = await promptLaunchWizard()

    const networkOverride = flags.network as SvmNetwork | undefined

    const launchInput = buildLaunchInput(
      this.context.umi.identity.publicKey.toString(),
      this.context.chain,
      {
        launchType: wizardResult.launchType,
        token: {
          name: wizardResult.name,
          symbol: wizardResult.symbol,
          image: wizardResult.image,
          ...(wizardResult.description && { description: wizardResult.description }),
        },
        socials: {
          ...(wizardResult.website && { website: wizardResult.website }),
          ...(wizardResult.twitter && { twitter: wizardResult.twitter }),
          ...(wizardResult.telegram && { telegram: wizardResult.telegram }),
        },
        quoteMint: wizardResult.quoteMint,
        depositStartTime: wizardResult.depositStartTime,
        tokenAllocation: wizardResult.tokenAllocation,
        raiseGoal: wizardResult.raiseGoal,
        raydiumLiquidityBps: wizardResult.raydiumLiquidityBps,
        fundsRecipient: wizardResult.fundsRecipient,
        creatorFeeWallet: wizardResult.creatorFeeWallet,
        firstBuyAmount: wizardResult.firstBuyAmount,
        agent: wizardResult.agentMint ? {
          mint: wizardResult.agentMint,
          setToken: wizardResult.agentSetToken ?? false,
        } : undefined,
      },
      networkOverride,
    )

    return this.sendLaunch(launchInput, flags.apiUrl as string | undefined)
  }

  /* ------------------------------------------------------------------ */
  /*  Send launch (shared by wizard and flag modes)                      */
  /* ------------------------------------------------------------------ */

  private async sendLaunch(launchInput: CreateLaunchInput, apiUrl?: string): Promise<unknown> {
    const spinner = ora('Creating token launch via Genesis API...').start()

    try {
      const apiConfig: GenesisApiConfig = {
        baseUrl: apiUrl ?? 'https://api.metaplex.com',
      }

      spinner.text = 'Building transactions via Genesis API...'

      const allowedCommitments = ['processed', 'confirmed', 'finalized'] as const
      const commitment = allowedCommitments.includes(this.context.commitment as typeof allowedCommitments[number])
        ? (this.context.commitment as typeof allowedCommitments[number])
        : 'confirmed'

      const result = await createAndRegisterLaunch(
        this.context.umi,
        apiConfig,
        launchInput,
        { commitment },
      )

      spinner.succeed('Token launch created and registered successfully!')

      this.log('')
      this.logSuccess(`Genesis Account: ${result.genesisAccount}`)
      this.log(`Mint Address: ${result.mintAddress}`)
      this.log(`Launch ID: ${result.launch.id}`)
      this.log(`Launch Link: ${result.launch.link}`)
      this.log(`Token ID: ${result.token.id}`)
      if (launchInput.agent) {
        this.log(`Agent Mint: ${typeof launchInput.agent.mint === 'string' ? launchInput.agent.mint : launchInput.agent.mint.toString()}`)
      }
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
}
