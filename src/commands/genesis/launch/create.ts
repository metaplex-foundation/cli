import type {
  CreateLaunchInput,
  GenesisApiConfig,
  LockedAllocation,
  SvmNetwork,
  TimeUnit,
} from '@metaplex-foundation/genesis'

import {
  createLaunch,
  isGenesisApiError,
  isGenesisApiNetworkError,
  isGenesisValidationError,
  registerLaunch,
  signAndSendLaunchTransactions,
} from '@metaplex-foundation/genesis'
import { Flags } from '@oclif/core'
import { existsSync, readFileSync } from 'node:fs'
import ora from 'ora'

import { TransactionCommand } from '../../../TransactionCommand.js'
import { generateExplorerUrl } from '../../../explorers.js'
import { RpcChain, txSignatureToString } from '../../../lib/util.js'

const VALID_TIME_UNITS: TimeUnit[] = [
  'SECOND', 'MINUTE', 'HOUR', 'DAY', 'WEEK',
  'TWO_WEEKS', 'MONTH', 'QUARTER', 'YEAR',
]

export default class GenesisLaunchCreate extends TransactionCommand<typeof GenesisLaunchCreate> {
  static override description = `Create a new project launch via the Genesis API.

This command uses the Metaplex Genesis API to create a complete token launch
including launchpool configuration, optional locked/vesting allocations, and
automatic Raydium liquidity pairing.

The launch flow:
  1. Calls the Genesis API to build the required transactions
  2. Signs and sends each transaction to the Solana network
  3. Registers the launch with the Genesis API

Total token supply is fixed at 1,000,000,000 tokens.
The deposit period lasts exactly 48 hours from the deposit start time.
Any remaining tokens (after launchpool + locked allocations + Raydium LP) are
automatically assigned to an unlocked creator allocation.`

  static override examples = [
    '$ mplx genesis launch create --name "My Token" --symbol "MTK" --image "https://gateway.irys.xyz/abc123" --token-allocation 500000000 --deposit-start-time "2026-03-01T00:00:00Z" --raise-goal 200 --raydium-liquidity-bps 5000 --funds-recipient RecipientWallet...',
    '$ mplx genesis launch create --name "My Token" --symbol "MTK" --image "https://gateway.irys.xyz/abc123" --token-allocation 500000000 --deposit-start-time "2026-03-01T00:00:00Z" --raise-goal 25000 --raydium-liquidity-bps 8000 --funds-recipient RecipientWallet... --quote-mint USDC',
    '$ mplx genesis launch create --name "My Token" --symbol "MTK" --image "https://gateway.irys.xyz/abc123" --token-allocation 300000000 --deposit-start-time "2026-03-01T00:00:00Z" --raise-goal 200 --raydium-liquidity-bps 5000 --funds-recipient RecipientWallet... --locked-allocations-file ./allocations.json',
  ]

  static override flags = {
    'deposit-start-time': Flags.string({
      description: 'When the deposit period opens (ISO 8601 datetime, e.g. "2026-03-01T00:00:00Z"). Deposit lasts 48h.',
      required: true,
    }),
    description: Flags.string({
      description: 'Token description (max 250 characters)',
      required: false,
    }),
    'funds-recipient': Flags.string({
      description: 'Wallet address that receives the unlocked portion of raised funds',
      required: true,
    }),
    image: Flags.string({
      description: 'Token image URL (must be a valid URL, Irys-hosted recommended)',
      required: true,
    }),
    // ── Locked Allocations ──────────────────────────
    'locked-allocations-file': Flags.string({
      description: 'Path to a JSON file containing locked/vesting token allocations',
      required: false,
    }),
    // ── Token Metadata ──────────────────────────────
    name: Flags.string({
      char: 'n',
      description: 'Token name (1-32 characters)',
      required: true,
    }),
    // ── Optional Configuration ──────────────────────
    'quote-mint': Flags.string({
      default: 'SOL',
      description: 'Quote token: "SOL" (default), "USDC", or a mint address',
    }),

    'raise-goal': Flags.integer({
      description: 'Minimum amount of quote tokens to raise (in whole units, e.g. 200 = 200 SOL)',
      required: true,
    }),
    'raydium-liquidity-bps': Flags.integer({
      description: 'Percentage of raised funds for Raydium LP in basis points (2000-10000, e.g. 5000 = 50%)',
      required: true,
    }),
    symbol: Flags.string({
      char: 's',
      description: 'Token ticker symbol (1-10 characters)',
      required: true,
    }),
    telegram: Flags.string({
      description: 'Telegram handle or URL',
      required: false,
    }),
    // ── Launchpool Configuration ────────────────────
    'token-allocation': Flags.integer({
      description: 'Number of tokens to sell via the launchpool (portion of 1 billion total supply)',
      required: true,
    }),

    twitter: Flags.string({
      description: 'Twitter/X handle or URL',
      required: false,
    }),

    website: Flags.string({
      description: 'Project website URL',
      required: false,
    }),
  }

  static override usage = 'genesis launch create [FLAGS]'

  public async run(): Promise<void> {
    const { flags } = await this.parse(GenesisLaunchCreate)

    // ── Validate and build input ─────────────────────────────────────────
    const network = this.mapChainToNetwork(this.context.chain)

    const depositStartDate = new Date(flags['deposit-start-time'])
    if (Number.isNaN(depositStartDate.getTime())) {
      this.error(
        `Invalid --deposit-start-time: "${flags['deposit-start-time']}". ` +
        'Use ISO 8601 format (e.g. "2026-03-01T00:00:00Z").'
      )
    }

    let lockedAllocations: LockedAllocation[] | undefined
    if (flags['locked-allocations-file']) {
      lockedAllocations = this.parseLockedAllocationsFile(flags['locked-allocations-file'])
    }

    const externalLinks =
      flags.website || flags.twitter || flags.telegram
        ? {
            ...(flags.website ? { website: flags.website } : {}),
            ...(flags.twitter ? { twitter: flags.twitter } : {}),
            ...(flags.telegram ? { telegram: flags.telegram } : {}),
          }
        : undefined

    const input: CreateLaunchInput = {
      launch: {
        launchpool: {
          depositStartTime: depositStartDate,
          fundsRecipient: flags['funds-recipient'],
          raiseGoal: flags['raise-goal'],
          raydiumLiquidityBps: flags['raydium-liquidity-bps'],
          tokenAllocation: flags['token-allocation'],
        },
        ...(lockedAllocations ? { lockedAllocations } : {}),
      },
      launchType: 'project',
      network,
      quoteMint: flags['quote-mint'],
      token: {
        image: flags.image,
        name: flags.name,
        symbol: flags.symbol,
        ...(flags.description ? { description: flags.description } : {}),
        ...(externalLinks ? { externalLinks } : {}),
      },
      wallet: this.context.signer.publicKey,
    }

    const apiConfig: GenesisApiConfig = {}

    // ── Step 1: Create launch (get unsigned transactions) ────────────────
    const spinner = ora('Creating launch via Genesis API...').start()

    try {
      const createResult = await createLaunch(this.context.umi, apiConfig, input)

      spinner.succeed(`Launch created - ${createResult.transactions.length} transaction(s) to sign`)

      // ── Step 2: Sign and send transactions ────────────────────────────
      const txSpinner = ora(
        `Signing and sending ${createResult.transactions.length} transaction(s)...`
      ).start()

      const signatures = await signAndSendLaunchTransactions(
        this.context.umi,
        createResult,
        { commitment: this.context.commitment },
      )

      txSpinner.succeed(`All ${signatures.length} transaction(s) confirmed`)

      // ── Step 3: Register the launch ───────────────────────────────────
      const regSpinner = ora('Registering launch...').start()

      const registerResult = await registerLaunch(this.context.umi, apiConfig, {
        createLaunchInput: input,
        genesisAccount: createResult.genesisAccount,
      })

      regSpinner.succeed('Launch registered successfully!')

      // ── Output results ────────────────────────────────────────────────
      this.log('')
      this.logSuccess('Project launch created and registered!')
      this.log('')
      this.log(`Genesis Account: ${createResult.genesisAccount}`)
      this.log(`Mint Address:    ${createResult.mintAddress}`)
      this.log(`Launch ID:       ${registerResult.launch.id}`)
      this.log(`Launch Link:     ${registerResult.launch.link}`)
      this.log('')
      this.log('Transactions:')
      for (const [i, sig] of signatures.entries()) {
        const sigStr = txSignatureToString(sig)
        this.log(`  ${i + 1}. ${sigStr}`)
        this.log(
          `     ${generateExplorerUrl(this.context.explorer, this.context.chain, sigStr, 'transaction')}`
        )
      }

      this.log('')
      this.log(
        `View account: ${generateExplorerUrl(this.context.explorer, this.context.chain, createResult.genesisAccount, 'account')}`
      )

    } catch (error) {
      spinner.stop()
      this.handleGenesisError(error)
    }
  }

  /**
   * Handles genesis API errors with user-friendly messages.
   */
  private handleGenesisError(error: unknown): never {
    if (isGenesisValidationError(error)) {
      this.error(`Validation error (${error.field}): ${error.message}`)
    }

    if (isGenesisApiError(error)) {
      const statusHint =
        error.statusCode === 400 ? ' - check your input parameters'
        : error.statusCode === 429 ? ' - rate limited, please try again later'
        : error.statusCode >= 500 ? ' - server error, please try again later'
        : ''
      this.error(`Genesis API error (${error.statusCode}${statusHint}): ${error.message}`)
    }

    if (isGenesisApiNetworkError(error)) {
      this.error(
        `Network error connecting to Genesis API: ${error.message}\n` +
        'Please check your internet connection and try again.'
      )
    }

    throw error
  }

  /**
   * Maps the CLI's RpcChain enum to the SvmNetwork string expected by the Genesis API.
   */
  private mapChainToNetwork(rpcChain: RpcChain): SvmNetwork {
    switch (rpcChain) {
      case RpcChain.Mainnet: {
        return 'solana-mainnet'
      }

      case RpcChain.Devnet: {
        return 'solana-devnet'
      }

      case RpcChain.Localnet: {
        this.error(
          'Localnet is not supported for project launches. Please use devnet or mainnet.\n' +
          'Set your RPC endpoint using --rpc or "mplx config set rpc <url>".'
        )
      }
    }
  }

  /**
   * Reads and validates the locked allocations JSON file.
   */
  private parseLockedAllocationsFile(filePath: string): LockedAllocation[] {
    if (!existsSync(filePath)) {
      this.error(`Locked allocations file not found: ${filePath}`)
    }

    let raw: unknown
    try {
      const content = readFileSync(filePath, 'utf8')
      raw = JSON.parse(content)
    } catch (error) {
      this.error(`Failed to parse locked allocations JSON file: ${(error as Error).message}`)
    }

    if (!Array.isArray(raw)) {
      this.error('Locked allocations file must contain a JSON array of allocation objects.')
    }

    for (const [i, alloc] of raw.entries()) {
      const prefix = `allocations[${i}]`
      if (typeof alloc.name !== 'string' || !alloc.name) {
        this.error(`${prefix}.name is required and must be a non-empty string`)
      }

      if (typeof alloc.recipient !== 'string' || !alloc.recipient) {
        this.error(`${prefix}.recipient is required and must be a wallet address string`)
      }

      if (typeof alloc.tokenAmount !== 'number' || alloc.tokenAmount <= 0) {
        this.error(`${prefix}.tokenAmount is required and must be a positive number`)
      }

      if (!alloc.vestingStartTime) {
        this.error(`${prefix}.vestingStartTime is required (ISO 8601 datetime string)`)
      }

      if (!alloc.vestingDuration?.value || !alloc.vestingDuration?.unit) {
        this.error(`${prefix}.vestingDuration is required with { value: number, unit: TimeUnit }`)
      }

      if (!VALID_TIME_UNITS.includes(alloc.vestingDuration.unit)) {
        this.error(`${prefix}.vestingDuration.unit must be one of: ${VALID_TIME_UNITS.join(', ')}`)
      }

      if (!alloc.unlockSchedule || !VALID_TIME_UNITS.includes(alloc.unlockSchedule)) {
        this.error(`${prefix}.unlockSchedule is required and must be one of: ${VALID_TIME_UNITS.join(', ')}`)
      }

      if (alloc.cliff) {
        if (!alloc.cliff.duration?.value || !alloc.cliff.duration?.unit) {
          this.error(`${prefix}.cliff.duration is required with { value: number, unit: TimeUnit }`)
        }

        if (!VALID_TIME_UNITS.includes(alloc.cliff.duration.unit)) {
          this.error(`${prefix}.cliff.duration.unit must be one of: ${VALID_TIME_UNITS.join(', ')}`)
        }
      }
    }

    return raw as LockedAllocation[]
  }
}
