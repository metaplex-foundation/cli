import { Args, Command } from '@oclif/core'
import { dirname } from 'path'
import { getDefaultConfigPath, readConfig } from '../../../lib/Context.js'
import { ensureDirectoryExists, writeJsonSync } from '../../../lib/file.js'

export default class ConfigWalletRemoveCommand extends Command {
  static override description = 'Remove a wallet from the config'

  static override args = {
    name: Args.string({
      description: 'Name of wallet to remove from config',
      required: true,
    }),
  }

  static override examples = [
    '<%= config.bin %> <%= command.id %> remove dev1',
  ]

  public async run(): Promise<void> {
    const {flags, args} = await this.parse(ConfigWalletRemoveCommand)

    const path = flags.config ?? getDefaultConfigPath()

    const config = readConfig(path)

    // find and remove wallet by name

    if (!config.wallets) {
      this.log('No wallets found')
    } else {
      const existingName = config.wallets.find((wallet) => wallet.name === args.name)
      if (!existingName) {
        this.error(`Wallet with name ${args.name} does not exist`)
      }
      config.wallets = config.wallets.filter((wallet) => wallet.name !== args.name)
      this.log(`Wallet ${args.name} removed from config.`)

      const dir = dirname(path)
      ensureDirectoryExists(dir)
      writeJsonSync(path, config)
    }
  }
}
