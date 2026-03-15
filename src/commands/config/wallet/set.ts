import {Command, Args} from '@oclif/core'
import {getDefaultConfigPath, readConfig} from '../../../lib/Context.js'
import walletSelectorPrompt from '../../../prompts/walletSelectPrompt.js'
import {shortenAddress} from './../../../lib/util.js'

import {dirname} from 'path'
import {ensureDirectoryExists, writeJsonSync} from '../../../lib/file.js'

export default class ConfigWalletSetCommand extends Command {
  static override description = 'Set a new active wallet from a list of wallets. If no name is provided, opens interactive wallet selector.'

  static override args = {
    name: Args.string({ 
      description: 'Name of the wallet to set as active',
      required: false 
    })
  }

  public async run(): Promise<void> {

    const {flags, args} = await this.parse(ConfigWalletSetCommand)

    const path = flags.config ?? getDefaultConfigPath()

    const config = readConfig(path)

    if (!config.wallets || config.wallets.length === 0) {
      this.log('No wallets found')
      return
    }

    const availableWallets = config.wallets.map(wallet => ({
      name: wallet.name,
      path: wallet.path,
      publicKey: wallet.address
    }))

    let selectedWallet

    if (args.name) {
      // Find wallet by name
      selectedWallet = availableWallets.find(wallet => wallet.name === args.name)
      
      if (!selectedWallet) {
        this.error(`Wallet with name "${args.name}" not found. Available wallets: ${availableWallets.map(w => w.name).join(', ')}`)
      }
    } else {
      // Use interactive selector
      selectedWallet = await walletSelectorPrompt(availableWallets)
    }

    config.keypair = selectedWallet.path

    const dir = dirname(path)
    ensureDirectoryExists(dir)
    writeJsonSync(path, config)

    this.log(`Selected wallet: ${selectedWallet.name} (${shortenAddress(selectedWallet.publicKey)})`)
  }
}