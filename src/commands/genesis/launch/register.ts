import {
  CreateLaunchInput,
  GenesisApiConfig,
  SvmNetwork,
  registerLaunch,
} from '@metaplex-foundation/genesis'
import { isPublicKey } from '@metaplex-foundation/umi'
import { Args, Flags } from '@oclif/core'
import ora from 'ora'

import { TransactionCommand } from '../../../TransactionCommand.js'
import { readJsonSync } from '../../../lib/file.js'
import { getDefaultApiUrl } from '../../../lib/genesis/launchApi.js'
import { detectSvmNetwork } from '../../../lib/util.js'

export default class GenesisLaunchRegister extends TransactionCommand<typeof GenesisLaunchRegister> {
  static override args = {
    genesisAccount: Args.string({
      description: 'Genesis account address to register',
      required: true,
    }),
  }

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

  static override flags = {
    apiUrl: Flags.string({
      description: 'Genesis API base URL (defaults to https://api.metaplex.com for mainnet, https://api.metaplex.dev for devnet)',
      required: false,
    }),
    creatorWallet: Flags.string({
      description: 'Override the launch owner wallet for registration (public key address)',
      required: false,
    }),
    launchConfig: Flags.string({
      description: 'Path to JSON file with the launch configuration (same format as launch create input)',
      required: true,
    }),
    network: Flags.option({
      description: 'Network override (auto-detected from RPC if not set)',
      options: ['solana-mainnet', 'solana-devnet'] as const,
      required: false,
    })(),
    twitterVerificationToken: Flags.string({
      description: 'Twitter verification token for verified badge on the launch page',
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
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
          throw new Error(`Launch config file not found: ${filePath}`)
        }

        throw error
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
        throw new TypeError('Launch config token must include string fields: "name", "symbol", "image"')
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
      } else {
        // Bonding curve: validate optional fields when present
        if (launch.creatorFeeWallet !== undefined && (typeof launch.creatorFeeWallet !== 'string' || launch.creatorFeeWallet.length === 0)) {
            throw new Error('Bonding curve "launch.creatorFeeWallet" must be a non-empty string (public key)')
          }

        if (launch.firstBuyAmount !== undefined) {
          const amount = Number(launch.firstBuyAmount)
          if (Number.isNaN(amount) || !Number.isFinite(amount) || amount < 0) {
            throw new Error('Bonding curve "launch.firstBuyAmount" must be a finite, non-negative number')
          }
        }
      }

      const launchConfig = config as unknown as CreateLaunchInput

      // Override network if specified via flag
      launchConfig.network = network

      // Use the configured signer as wallet if not set in the config
      if (!launchConfig.wallet) {
        launchConfig.wallet = this.context.umi.identity.publicKey.toString()
      }

      const apiConfig: GenesisApiConfig = {
        baseUrl: flags.apiUrl ?? getDefaultApiUrl(network),
      }

      // Validate registration flags
      if (flags.creatorWallet && !isPublicKey(flags.creatorWallet)) {
        throw new Error('--creatorWallet must be a valid public key')
      }

      const result = await registerLaunch(this.context.umi, apiConfig, {
        createLaunchInput: launchConfig,
        genesisAccount: args.genesisAccount,
        ...(flags.creatorWallet && { creatorWallet: flags.creatorWallet }),
        ...(flags.twitterVerificationToken && { twitterVerificationToken: flags.twitterVerificationToken }),
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
        existing: result.existing,
        launchId: result.launch.id,
        launchLink: result.launch.link,
        mintAddress: result.token.mintAddress,
        tokenId: result.token.id,
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
