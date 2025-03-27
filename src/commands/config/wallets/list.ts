import {Command} from '@oclif/core'
import {getDefaultConfigPath, readConfig} from '../../../lib/Context.js'

export default class ConfigWalletListCommand extends Command {
  static override description = 'List all wallets'

  static override examples = ['<%= config.bin %> <%= command.id %> list']

  public async run(): Promise<void> {
    const {flags, args} = await this.parse(ConfigWalletListCommand)

    const path = flags.config ?? getDefaultConfigPath(this.config.configDir)

    const config = readConfig(path)

    if (!config.wallets) {
      this.log('No wallets found')
    } else {
      this.log('Installed Wallets:')
      console.table(config.wallets)
    }
  }
}
