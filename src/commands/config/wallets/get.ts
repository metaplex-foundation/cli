import {Command} from '@oclif/core'
import {getDefaultConfigPath, readConfig} from '../../../lib/Context.js'

export default class ConfigWalletsGetCommand extends Command {
  static override description = 'Get the active wallet'

  static override examples = ['<%= config.bin %> <%= command.id %>']

  static enableJsonFlag = true

  public async run(): Promise<unknown> {
    const {flags} = await this.parse(ConfigWalletsGetCommand)

    const path = flags.config ?? getDefaultConfigPath()

    const config = readConfig(path)

    const activeWallet = config.wallets?.find(wallet => wallet.path === config.keypair)

    if (activeWallet) {
      this.log(`Active Wallet: ${activeWallet.name} (${activeWallet.address})`)
      return { name: activeWallet.name, address: activeWallet.address, path: activeWallet.path }
    }

    if (config.keypair) {
      this.log(`Active Wallet: ${config.keypair}`)
      return { path: config.keypair }
    }

    this.log('No active wallet configured')
    return {}
  }
}
