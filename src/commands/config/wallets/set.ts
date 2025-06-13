import {Command} from '@oclif/core'
import {getDefaultConfigPath, readConfig} from '../../../lib/Context.js'
import walletSelectorPrompt from '../../../prompts/walletSelectPrompt.js'
import {shortenAddress} from './../../../lib/util.js'

import {dirname, resolve} from 'path'
import {ensureDirectoryExists, writeJsonSync} from '../../../lib/file.js'
import fs from 'fs'

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

    const selectedWallet = await walletSelectorPrompt(config.wallets.map(wallet => ({
      name: wallet.name,
      path: wallet.path,
      publicKey: wallet.address
    })))

    // Normalize the path to be absolute
    const normalizedPath = resolve(selectedWallet.path)
    
    // Validate the file exists
    if (!fs.existsSync(normalizedPath)) {
      this.error(`Wallet file not found at: ${normalizedPath}`)
      return
    }

    config.keypair = normalizedPath

    const dir = dirname(path)
    ensureDirectoryExists(dir)
    writeJsonSync(path, config)

    this.log(`Selected wallet: ${selectedWallet.name} (${shortenAddress(selectedWallet.publicKey)})`)
  }
}