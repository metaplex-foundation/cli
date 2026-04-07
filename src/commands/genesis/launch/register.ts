import {
  CreateLaunchInput,
  GenesisApiConfig,
  SvmNetwork,
  registerLaunch,
} from '@metaplex-foundation/genesis'
import { Args, Flags } from '@oclif/core'
import ora from 'ora'

import { TransactionCommand } from '../../../TransactionCommand.js'
import { readJsonSync } from '../../../lib/file.js'
import { detectSvmNetwork } from '../../../lib/util.js'

export default class GenesisLaunchRegister extends TransactionCommand<typeof GenesisLaunchRegister> {
  static override description = `Register an existing genesis account with the Metaplex platform.

Use this command if you created a genesis account using the low-level CLI commands
(genesis create, bucket add-launch-pool, etc.) and want to register it on the
Metaplex platform to get a public launch page.

Requires the same launch configuration that was used to create the genesis account,
provided as a JSON file via --launchConfig.`

  static override examples = [
    '$ mplx genesis launch register <GENESIS_ACCOUNT> --launchConfig launch.json',
    '$ mplx genesis launch register <GENESIS_ACCOUNT> --launchConfig launch.json --network solana-devnet',
  ]

  static override args = {
    genesisAccount: Args.string({
      description: 'Genesis account address to register',
      required: true,
    }),
  }

  static override flags = {
    launchConfig: Flags.string({
      description: 'Path to JSON file with the launch configuration (same format as launch create input)',
      required: true,
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

  static override usage = 'genesis launch register <GENESIS_ACCOUNT> [FLAGS]'

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(GenesisLaunchRegister)

    const spinner = ora('Registering genesis account...').start()

    try {
      // Detect network from chain if not specified
      const network: SvmNetwork = flags.network ?? detectSvmNetwork(this.context.chain)

      // Read launch config from JSON file
      const filePath = flags.launchConfig
      let parsed: unknown
      try {
        parsed = readJsonSync(filePath)
      } catch (err) {
        if (err && typeof err === 'object' && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
          throw new Error(`Launch config file not found: ${filePath}`)
        }
        throw err
      }

      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Launch config must be a JSON object')
      }
      const config = parsed as Record<string, unknown>

      // Validate required top-level fields
      if (!config.token || typeof config.token !== 'object' || Array.isArray(config.token)) {
        throw new Error('Launch config is missing required "token" object (must include name, symbol, image)')
      }
      const token = config.token as Record<string, unknown>
      if (typeof token.name !== 'string' || typeof token.symbol !== 'string' || typeof token.image !== 'string') {
        throw new Error('Launch config token must include string fields: "name", "symbol", "image"')
      }
      if (!config.launch || typeof config.launch !== 'object' || Array.isArray(config.launch)) {
        throw new Error('Launch config is missing required "launch" object')
      }
      if (config.launchType === undefined || config.launchType === null) {
        config.launchType = 'launchpool'
      }
      if (config.launchType !== 'launchpool' && config.launchType !== 'bondingCurve') {
        throw new Error(`Launch config "launchType" must be "launchpool" or "bondingCurve", got "${config.launchType}"`)
      }

      // Validate required launch fields per type
      const launch = config.launch as Record<string, unknown>
      if (config.launchType === 'launchpool') {
        if (!launch.launchpool || typeof launch.launchpool !== 'object' || Array.isArray(launch.launchpool)) {
          throw new Error('Launchpool config requires a "launch.launchpool" object')
        }
        const pool = launch.launchpool as Record<string, unknown>
        if (!pool.tokenAllocation || !pool.depositStartTime || !pool.raiseGoal || !pool.raydiumLiquidityBps || !pool.fundsRecipient) {
          throw new Error('Launchpool config requires "tokenAllocation", "depositStartTime", "raiseGoal", "raydiumLiquidityBps", and "fundsRecipient" in launch.launchpool')
        }
      }
      // Bonding curve: the launch field is a BondingCurveLaunchInput directly
      // (optional fields: creatorFeeWallet, firstBuyAmount). No nested key required.

      const launchConfig = config as unknown as CreateLaunchInput

      // Override network if specified via flag
      launchConfig.network = network

      // Use the configured signer as wallet if not set in the config
      if (!launchConfig.wallet) {
        launchConfig.wallet = this.context.umi.identity.publicKey.toString()
      }

      const apiConfig: GenesisApiConfig = {
        baseUrl: flags.apiUrl,
      }

      const result = await registerLaunch(this.context.umi, apiConfig, {
        genesisAccount: args.genesisAccount,
        createLaunchInput: launchConfig,
      })

      if (result.existing) {
        spinner.succeed('Genesis account was already registered.')
      } else {
        spinner.succeed('Genesis account registered successfully!')
      }

      this.log('')
      this.logSuccess(`Launch ID: ${result.launch.id}`)
      this.log(`Launch Link: ${result.launch.link}`)
      this.log(`Token ID: ${result.token.id}`)
      this.log(`Mint Address: ${result.token.mintAddress}`)

      return {
        launchId: result.launch.id,
        launchLink: result.launch.link,
        tokenId: result.token.id,
        mintAddress: result.token.mintAddress,
        existing: result.existing,
      }
    } catch (error) {
      spinner.fail('Failed to register genesis account')
      if (error && typeof error === 'object' && 'responseBody' in error) {
        this.logJson((error as { responseBody: unknown }).responseBody)
      }

      throw error
    }
  }
}
