import {
  CreateLaunchInput,
  GenesisApiConfig,
  SvmNetwork,
  registerLaunch,
} from '@metaplex-foundation/genesis'
import { Args, Flags } from '@oclif/core'
import { existsSync } from 'node:fs'
import ora from 'ora'

import { TransactionCommand } from '../../../TransactionCommand.js'
import { readJsonSync } from '../../../lib/file.js'
import { RpcChain } from '../../../lib/util.js'

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

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(GenesisLaunchRegister)

    const spinner = ora('Registering genesis account...').start()

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

      // Read launch config from JSON file
      const filePath = flags.launchConfig
      if (!existsSync(filePath)) {
        throw new Error(`Launch config file not found: ${filePath}`)
      }

      const launchConfig = readJsonSync(filePath) as CreateLaunchInput

      // Override network if specified via flag
      launchConfig.network = network

      // Use the configured signer as wallet if not set in the config
      if (!launchConfig.wallet) {
        launchConfig.wallet = this.context.signer.publicKey.toString()
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
    } catch (error) {
      spinner.fail('Failed to register genesis account')
      if (error && typeof error === 'object' && 'responseBody' in error) {
        this.logJson((error as { responseBody: unknown }).responseBody)
      }

      throw error
    }
  }
}
