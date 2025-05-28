import {Command} from '@oclif/core'
import {getDefaultConfigPath, readConfig} from '../../../lib/Context.js'
import walletSelectorPrompt from '../../../prompts/walletSelectPrompt.js'
import {shortenAddress} from './../../../lib/util.js'

import {dirname} from 'path'
import {ensureDirectoryExists, writeJsonSync} from '../../../lib/file.js'

export default class ConfigWalletSetCommand extends Command {
  static override description = 'Set a new active wallet from a list of wallets'

  public async run(): Promise<void> {

    const {flags, args} = await this.parse(ConfigWalletSetCommand)

    const path = flags.config ?? getDefaultConfigPath()

    const config = readConfig(path)

    if (!config.wallets || config.wallets.length === 0) {
      this.log('No wallets found')
      return
    }

    const selectedWallet = await walletSelectorPrompt(config.wallets)

    config.keypair = selectedWallet.path

    const dir = dirname(path)
    ensureDirectoryExists(dir)
    writeJsonSync(path, config)

    this.log(`Active wallet set to  ${selectedWallet.name + ' ' + shortenAddress(selectedWallet.address)}`)
  }
}
