import {
  CreateBondingCurveLaunchInput,
  CreateLaunchInput,
  CreateLaunchpoolLaunchInput,
  GenesisApiConfig,
  LockedAllocation,
  QuoteMintInput,
  RegisterLaunchInput,
  SvmNetwork,
  createAndRegisterLaunch,
} from '@metaplex-foundation/genesis'
import { isPublicKey } from '@metaplex-foundation/umi'
import { Flags } from '@oclif/core'
import ora from 'ora'

import { TransactionCommand } from '../../../TransactionCommand.js'
import { generateExplorerUrl } from '../../../explorers.js'
import { readJsonSync } from '../../../lib/file.js'
import { promptLaunchWizard, toISOTimestamp } from '../../../lib/genesis/createGenesisWizardPrompt.js'
import { buildLaunchInput, getDefaultApiUrl } from '../../../lib/genesis/launchApi.js'
import { detectSvmNetwork, txSignatureToString } from '../../../lib/util.js'

/* ------------------------------------------------------------------ */
/*  Launch strategy types & implementations                            */
/* ------------------------------------------------------------------ */

interface CommonLaunchParams {
  agent?: {
    mint: string
    setToken: boolean
  }
  network: SvmNetwork
  quoteMint?: QuoteMintInput
  token: {
    description?: string
    externalLinks?: Record<string, string>
    image: string
    name: string
    symbol: string
  }
  wallet: string
}

interface LaunchStrategy {
  buildInput(common: CommonLaunchParams, flags: Record<string, unknown>): CreateLaunchInput
  disallowedFlags: string[]
  requiredFlags: string[]
  validate(flags: Record<string, unknown>): string[]
}

const LAUNCH_STRATEGIES: Record<string, LaunchStrategy> = {
  'bonding-curve': {
    buildInput(common, flags): CreateBondingCurveLaunchInput {
      return {
        ...common,
        launch: {
          ...(typeof flags.creatorFeeWallet === 'string' && { creatorFeeWallet: flags.creatorFeeWallet }),
          ...(typeof flags.firstBuyAmount === 'number' && flags.firstBuyAmount > 0 && { firstBuyAmount: flags.firstBuyAmount }),
        },
        launchType: 'bondingCurve',
      }
    },
    disallowedFlags: ['tokenAllocation', 'raiseGoal', 'raydiumLiquidityBps', 'fundsRecipient', 'lockedAllocations', 'depositStartTime'],

    requiredFlags: [],

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
  },

  'launchpool': {
    buildInput(common, flags): CreateLaunchpoolLaunchInput {
      let lockedAllocations: LockedAllocation[] | undefined
      if (typeof flags.lockedAllocations === 'string') {
        lockedAllocations = parseLockedAllocations(flags.lockedAllocations)
      }

      return {
        ...common,
        launch: {
          launchpool: {
            depositStartTime: flags.depositStartTime as string,
            fundsRecipient: flags.fundsRecipient as string,
            raiseGoal: flags.raiseGoal as number,
            raydiumLiquidityBps: flags.raydiumLiquidityBps as number,
            tokenAllocation: flags.tokenAllocation as number,
          },
          ...(lockedAllocations && { lockedAllocations }),
        },
        launchType: 'launchpool',
      }
    },
    disallowedFlags: ['creatorFeeWallet', 'firstBuyAmount'],

    requiredFlags: ['tokenAllocation', 'raiseGoal', 'raydiumLiquidityBps', 'fundsRecipient'],

    validate(flags) {
      const errors: string[] = []
      if (typeof flags.tokenAllocation === 'number' && flags.tokenAllocation <= 0) {
        errors.push('--tokenAllocation must be a positive number')
      }

      if (typeof flags.raiseGoal === 'number' && flags.raiseGoal <= 0) {
        errors.push('--raiseGoal must be a positive number')
      }

      if (typeof flags.raydiumLiquidityBps === 'number' &&
          (flags.raydiumLiquidityBps < 2000 || flags.raydiumLiquidityBps > 10_000)) {
        errors.push('--raydiumLiquidityBps must be between 2000 and 10000 (20%-100%)')
      }

      if (typeof flags.fundsRecipient === 'string' && !isPublicKey(flags.fundsRecipient)) {
        errors.push('--fundsRecipient must be a valid public key')
      }

      return errors
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
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Locked allocations file not found: ${filePath}`)
    }

    throw error
  }

  if (!Array.isArray(parsed)) {
    throw new TypeError('Locked allocations file must contain a JSON array')
  }

  const validTimeUnits = new Set(['SECOND', 'MINUTE', 'HOUR', 'DAY', 'WEEK', 'TWO_WEEKS', 'MONTH', 'QUARTER', 'YEAR'])
  for (const [i, entry] of parsed.entries()) {
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

Agent mode (--agentAsset) wraps transactions for execution by an on-chain agent,
enabling AI agents to launch tokens autonomously.

Use --wizard for an interactive guided setup.`

  static override examples = [
    '$ mplx genesis launch create --wizard',
    '$ mplx genesis launch create --name "My Token" --symbol "MTK" --image "https://gateway.irys.xyz/abc123" --tokenAllocation 500000000 --depositStartTime 2025-03-01T00:00:00Z --raiseGoal 200 --raydiumLiquidityBps 5000 --fundsRecipient <ADDRESS>',
    '$ mplx genesis launch create --launchType bonding-curve --name "My Meme" --symbol "MEME" --image "https://gateway.irys.xyz/abc123"',
    '$ mplx genesis launch create --launchType bonding-curve --name "My Meme" --symbol "MEME" --image "https://gateway.irys.xyz/abc123" --creatorFeeWallet <ADDRESS> --firstBuyAmount 0.1',
    '$ mplx genesis launch create --launchType bonding-curve --name "Agent Token" --symbol "AGT" --image "https://gateway.irys.xyz/abc123" --agentAsset <AGENT_NFT_ADDRESS> --agentSetToken',
    '$ mplx genesis launch create --name "My Token" --symbol "MTK" --image "https://gateway.irys.xyz/abc123" --tokenAllocation 500000000 --depositStartTime 2025-03-01T00:00:00Z --raiseGoal 200 --raydiumLiquidityBps 5000 --fundsRecipient <ADDRESS> --lockedAllocations allocations.json',
  ]

  static override flags = {
    // Agent mode
    agentAsset: Flags.string({
      description: 'Agent Core asset address. Wraps transactions for agent execution, enabling AI agents to launch tokens.',
      required: false,
    }),

    agentSetToken: Flags.boolean({
      default: false,
      description: 'When using --agentAsset, set the launched token on the agent NFT.',
    }),

    apiUrl: Flags.string({
      description: 'Genesis API base URL (defaults to https://api.metaplex.com for mainnet, https://api.metaplex.dev for devnet)',
      required: false,
    }),
    // Bonding curve config
    creatorFeeWallet: Flags.string({
      description: '[bonding-curve only] Wallet address to receive creator fees (defaults to launching wallet)',
      required: false,
    }),
    // Registration options
    creatorWallet: Flags.string({
      description: 'Override the launch owner wallet for registration (public key address)',
      required: false,
    }),
    // Shared config
    depositStartTime: Flags.string({
      description: '[launchpool only] Deposit start time (ISO date string or unix timestamp). 48h deposit period.',
      required: false,
    }),
    description: Flags.string({
      description: 'Token description (max 250 characters)',
      required: false,
    }),
    firstBuyAmount: Flags.string({
      description: '[bonding-curve only] SOL amount for mandatory first buy (e.g. 0.1 for 0.1 SOL). Omit to disable.',
      required: false,
    }),
    fundsRecipient: Flags.string({
      description: '[launchpool only] Funds recipient wallet address',
      required: false,
    }),

    image: Flags.string({
      description: 'Token image URL',
      required: false,
    }),

    // Launch type
    launchType: Flags.option({
      default: 'launchpool' as const,
      description: 'Launch type: launchpool (default) or bonding-curve',
      options: ['launchpool', 'bonding-curve'] as const,
    })(),
    // Optional
    lockedAllocations: Flags.string({
      description: '[launchpool only] Path to JSON file with locked allocation configs',
      required: false,
    }),
    // Token metadata
    name: Flags.string({
      char: 'n',
      description: 'Name of the token (1-32 characters)',
      required: false,
    }),
    network: Flags.option({
      description: 'Network override (auto-detected from RPC if not set)',
      options: ['solana-mainnet', 'solana-devnet'] as const,
      required: false,
    })(),

    quoteMint: Flags.string({
      default: 'SOL',
      description: 'Quote mint: SOL (default), USDC, or a mint address',
    }),
    raiseGoal: Flags.integer({
      description: '[launchpool only] Raise goal in whole units (e.g., 200 for 200 SOL)',
      required: false,
    }),

    raydiumLiquidityBps: Flags.integer({
      description: '[launchpool only] Raydium liquidity in basis points (2000-10000, i.e. 20%-100%)',
      required: false,
    }),
    symbol: Flags.string({
      char: 's',
      description: 'Symbol of the token (1-10 characters)',
      required: false,
    }),

    telegram: Flags.string({
      description: 'Project Telegram URL',
      required: false,
    }),
    // Project-only launchpool config
    tokenAllocation: Flags.integer({
      description: '[launchpool only] Launch pool token allocation (portion of 1B total supply)',
      required: false,
    }),

    twitter: Flags.string({
      description: 'Project Twitter URL',
      required: false,
    }),
    twitterVerificationToken: Flags.string({
      description: 'Twitter verification token for verified badge on the launch page',
      required: false,
    }),
    website: Flags.string({
      description: 'Project website URL',
      required: false,
    }),
    // Wizard mode
    wizard: Flags.boolean({
      default: false,
      description: 'Interactive guided setup wizard',
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
      if (Number.isNaN(amount) || !Number.isFinite(amount) || amount < 0) {
        this.error('--firstBuyAmount must be a finite, non-negative number (e.g. 0.1)')
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

    // Validate registration flags
    if (flags.creatorWallet && !isPublicKey(flags.creatorWallet)) {
      this.error('--creatorWallet must be a valid public key')
    }

    // Validate agent flags
    if (flags.agentAsset && !isPublicKey(flags.agentAsset)) {
      this.error('--agentAsset must be a valid public key (agent Core asset address)')
    }

    if (flags.agentSetToken && !flags.agentAsset) {
      this.error('--agentSetToken requires --agentAsset')
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
      network,
      token: {
        image,
        name,
        symbol,
        ...(flags.description && { description: flags.description }),
        ...(Object.keys(externalLinks).length > 0 && { externalLinks }),
      },
      wallet: this.context.umi.identity.publicKey.toString(),
      ...(flags.quoteMint !== 'SOL' && { quoteMint: flags.quoteMint as QuoteMintInput }),
      ...(flags.agentAsset && {
        agent: {
          mint: flags.agentAsset,
          setToken: flags.agentSetToken,
        },
      }),
    }

    const launchInput = strategy.buildInput(common, flagRecord)

    const registerOptions: Omit<RegisterLaunchInput, 'createLaunchInput' | 'genesisAccount'> = {}
    if (flags.creatorWallet) registerOptions.creatorWallet = flags.creatorWallet
    if (flags.twitterVerificationToken) registerOptions.twitterVerificationToken = flags.twitterVerificationToken

    return this.sendLaunch(launchInput, flags.apiUrl ?? getDefaultApiUrl(network), registerOptions)
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
    const network: SvmNetwork = networkOverride ?? detectSvmNetwork(this.context.chain)

    const launchInput = buildLaunchInput(
      this.context.umi.identity.publicKey.toString(),
      this.context.chain,
      {
        agent: wizardResult.agentAsset ? {
          mint: wizardResult.agentAsset,
          setToken: wizardResult.agentSetToken ?? false,
        } : undefined,
        creatorFeeWallet: wizardResult.creatorFeeWallet,
        depositStartTime: wizardResult.depositStartTime,
        firstBuyAmount: wizardResult.firstBuyAmount,
        fundsRecipient: wizardResult.fundsRecipient,
        launchType: wizardResult.launchType,
        quoteMint: wizardResult.quoteMint,
        raiseGoal: wizardResult.raiseGoal,
        raydiumLiquidityBps: wizardResult.raydiumLiquidityBps,
        socials: {
          ...(wizardResult.website && { website: wizardResult.website }),
          ...(wizardResult.twitter && { twitter: wizardResult.twitter }),
          ...(wizardResult.telegram && { telegram: wizardResult.telegram }),
        },
        token: {
          image: wizardResult.image,
          name: wizardResult.name,
          symbol: wizardResult.symbol,
          ...(wizardResult.description && { description: wizardResult.description }),
        },
        tokenAllocation: wizardResult.tokenAllocation,
      },
      networkOverride,
    )

    const registerOptions: Omit<RegisterLaunchInput, 'createLaunchInput' | 'genesisAccount'> = {}
    if (flags.creatorWallet) registerOptions.creatorWallet = flags.creatorWallet as string
    if (flags.twitterVerificationToken) registerOptions.twitterVerificationToken = flags.twitterVerificationToken as string

    return this.sendLaunch(launchInput, (flags.apiUrl as string | undefined) ?? getDefaultApiUrl(network), registerOptions)
  }

  /* ------------------------------------------------------------------ */
  /*  Send launch (shared by wizard and flag modes)                      */
  /* ------------------------------------------------------------------ */

  private async sendLaunch(launchInput: CreateLaunchInput, apiUrl: string, registerOptions?: Omit<RegisterLaunchInput, 'createLaunchInput' | 'genesisAccount'>): Promise<unknown> {
    const spinner = ora('Creating token launch via Genesis API...').start()

    try {
      const apiConfig: GenesisApiConfig = {
        baseUrl: apiUrl,
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
        registerOptions,
      )

      spinner.succeed('Token launch created and registered successfully!')

      this.log('')
      this.logSuccess(`Genesis Account: ${result.genesisAccount}`)
      this.log(`Mint Address: ${result.mintAddress}`)
      this.log(`Launch ID: ${result.launch.id}`)
      this.log(`Launch Link: ${result.launch.link}`)
      this.log(`Token ID: ${result.token.id}`)
      if (launchInput.agent) {
        this.log(`Agent Asset: ${typeof launchInput.agent.mint === 'string' ? launchInput.agent.mint : launchInput.agent.mint.toString()}`)
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
        launchId: result.launch.id,
        launchLink: result.launch.link,
        mintAddress: result.mintAddress,
        ...(launchInput.agent && {
          agentAsset: typeof launchInput.agent.mint === 'string' ? launchInput.agent.mint : launchInput.agent.mint.toString(),
        }),
        signatures: result.signatures.map((sig: Uint8Array) => {
          const sigStr = txSignatureToString(sig)
          return { explorer: generateExplorerUrl(this.context.explorer, this.context.chain, sigStr, 'transaction'), signature: sigStr }
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
