import {Command} from '@oclif/core'
import {getDefaultConfigPath, readConfig} from '../../../lib/Context.js'

export default class ConfigWalletListCommand extends Command {
  static override description = 'List all wallets'

  static override examples = ['<%= config.bin %> <%= command.id %> list']

  static enableJsonFlag = true

  public async run(): Promise<unknown> {
    const {flags} = await this.parse(ConfigWalletListCommand)

    const path = flags.config ?? getDefaultConfigPath()

    const config = readConfig(path)

    if (!config.wallets || config.wallets.length === 0) {
      this.log('No wallets found')
      return { wallets: [] }
    }

    const wallets = config.wallets.map(wallet => ({
      name: wallet.name,
      address: wallet.address,
      path: wallet.path,
      active: wallet.path === config.keypair,
    }))

    this.log('Installed Wallets:')
    for (const wallet of wallets) {
      const marker = wallet.active ? ' (active)' : ''
      this.log(`  ${wallet.name}: ${wallet.address}${marker}`)
    }

    return { wallets }
  }
}
