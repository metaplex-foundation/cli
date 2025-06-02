import { Args, Command } from '@oclif/core'
import fs from 'fs'
import { dirname } from 'path'
import { createSignerFromPath, getDefaultConfigPath, readConfig } from '../../../lib/Context.js'
import { ensureDirectoryExists, writeJsonSync } from '../../../lib/file.js'
import { shortenAddress } from '../../../lib/util.js'

export default class ConfigWalletAddsCommand extends Command {
  static override description = 'Set a config value from a key'

  static override args = {
    name: Args.string({
      description: 'Name of wallet (max 6 characters, alphanumeric, hyphens and underscores only)',
      required: true,
    }),
    path: Args.string({ description: 'Path to keypair json file', required: true }),
  }

  static override examples = [
    '<%= config.bin %> <%= command.id %> add dev1 /path/to/keypair.json',
    '<%= config.bin %> <%= command.id %> set dev1',
    '<%= config.bin %> <%= command.id %> remove dev1',
  ]

  public async run(): Promise<void> {
    const { flags, args } = await this.parse(ConfigWalletAddsCommand)

    // Validate name
    if (args.name.length > 6) {
      this.error('Name must be 6 characters or less')
    }

    // Validate name contains only safe characters for all platforms
    // TODO: Move validation to validations file that is in other PR
    if (!/^[a-zA-Z0-9-_]+$/.test(args.name)) {
      this.error('Name must contain only alphanumeric characters, hyphens and underscores')
    }

    // Validate path
    if (!args.path.endsWith('.json')) {
      this.error('Path must be a json file')
    }

    // check if the file exists on intial add
    if (!fs.existsSync(args.path)) {
      this.error('File does not exist')
    }

    const path = flags.config ?? getDefaultConfigPath()

    const config = readConfig(path)

    const signer = await createSignerFromPath(args.path)

    if (!config.wallets) {
      config.wallets = []
    } else {
      const existingName = config.wallets.find((wallet) => wallet.name === args.name)
      if (existingName) {
        this.error(`Wallet with name ${args.name} already exists`)
      }

      const existingPath = config.wallets.find((wallet) => wallet.path === args.path)
      if (existingPath) {
        this.error(`Wallet with path ${args.path} already exists`)
      }

      const existingAddress = config.wallets.find((wallet) => wallet.address === signer.publicKey.toString())
      if (existingAddress) {
        this.error(`Wallet with address ${shortenAddress(signer.publicKey)} already exists`)
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

    this.log(`Wallet ${shortenAddress(signer.publicKey)} added to config.`)
  }
}
