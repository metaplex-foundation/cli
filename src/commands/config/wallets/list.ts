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

    const wallets = config.wallets.map(wallet => {
      const type = wallet.type || 'file'
      const isActive = type === 'asset-signer'
        ? wallet.name === config.activeWallet
        : ('path' in wallet && wallet.path === config.keypair && !config.activeWallet)

      return {
        name: wallet.name,
        address: wallet.address,
        type,
        active: isActive,
        ...(type === 'asset-signer' && 'asset' in wallet ? { asset: wallet.asset } : {}),
        ...('path' in wallet ? { path: wallet.path } : {}),
      }
    })

    this.log('Installed Wallets:')
    console.table(wallets)

    return { wallets }
  }
}
