import { Args, Command } from '@oclif/core'
import fs from 'fs'
import { dirname } from 'path'
import { createSignerFromPath, getDefaultConfigPath, readConfig } from '../../../lib/Context.js'
import { ensureDirectoryExists, writeJsonSync } from '../../../lib/file.js'
import { shortenAddress } from '../../../lib/util.js'

export default class ConfigWalletAddCommand extends Command {
  static override description = 'Add a new wallet to your configuration'

  static override args = {
    name: Args.string({
      description: 'Name of wallet (alphanumeric, hyphens and underscores only)',
      required: true,
    }),
    path: Args.string({ description: 'Path to keypair json file', required: true }),
  }

  static override examples = [
    '<%= config.bin %> <%= command.id %> my-wallet ~/.config/solana/id.json',
    '<%= config.bin %> <%= command.id %> mainnet-wallet ./wallets/mainnet.json',
    '<%= config.bin %> <%= command.id %> dev-wallet /Users/dev/.solana/devnet.json',
  ]

  public async run(): Promise<void> {
    const { flags, args } = await this.parse(ConfigWalletAddCommand)

    // Validate name (removed character limit for MCP compatibility)

    // Validate name contains only safe characters for all platforms
    // TODO: Move validation to validations file that is in other PR
    if (!/^[a-zA-Z0-9-_]+$/.test(args.name)) {
      this.error(`Invalid wallet name '${args.name}'. Name must contain only letters, numbers, hyphens (-), and underscores (_). Example: 'my-wallet' or 'dev_wallet_1'`)
    }

    // Validate path
    if (!args.path.endsWith('.json')) {
      this.error(`Invalid file type. Wallet file must be a .json keypair file. Received: ${args.path}`)
    }

    // Check if the file exists
    if (!fs.existsSync(args.path)) {
      this.error(`Wallet file not found at: ${args.path}\nPlease check the path and ensure the keypair file exists.`)
    }

    const path = flags.config ?? getDefaultConfigPath()

    const config = readConfig(path)

    const signer = await createSignerFromPath(args.path)

    if (!config.wallets) {
      config.wallets = []
    } else {
      const existingName = config.wallets.find((wallet) => wallet.name === args.name)
      if (existingName) {
        this.error(`A wallet named '${args.name}' already exists.\nUse a different name or run 'mplx config wallets remove ${args.name}' to remove the existing wallet first.`)
      }

      const existingPath = config.wallets.find((wallet) => wallet.path === args.path)
      if (existingPath) {
        this.error(`This wallet file is already configured as '${existingPath.name}'.\nUse 'mplx config wallets set ${existingPath.name}' to switch to it.`)
      }

      const existingAddress = config.wallets.find((wallet) => wallet.address === signer.publicKey.toString())
      if (existingAddress) {
        this.error(`This wallet address (${shortenAddress(signer.publicKey)}) is already configured as '${existingAddress.name}'.\nUse 'mplx config wallets set ${existingAddress.name}' to switch to it.`)
      }
    }

    config.wallets?.push({
      name: args.name,
      address: signer.publicKey,
      path: args.path,
    })

    const dir = dirname(path)
    ensureDirectoryExists(dir)
    writeJsonSync(path, config)

    this.log(`✅ Wallet '${args.name}' successfully added to configuration!\n   Address: ${signer.publicKey}\n   Path: ${args.path}\n\nUse 'mplx config wallets set ${args.name}' to make this your active wallet.`)
  }
}
