import {Command, Args} from '@oclif/core'
import {getDefaultConfigPath, readConfig} from '../../../lib/Context.js'
import walletSelectorPrompt from '../../../prompts/walletSelectPrompt.js'
import {shortenAddress} from './../../../lib/util.js'

import {dirname} from 'path'
import {ensureDirectoryExists, writeJsonSync} from '../../../lib/file.js'

export default class ConfigWalletSetCommand extends Command {
  static enableJsonFlag = true

  static override description = 'Set a new active wallet from a list of wallets. If no name is provided, opens interactive wallet selector.'

  static override args = {
    name: Args.string({
      description: 'Name of the wallet to set as active',
      required: false
    })
  }

  public async run(): Promise<unknown> {

    const {flags, args} = await this.parse(ConfigWalletSetCommand)

    const path = flags.config ?? getDefaultConfigPath()

    const config = readConfig(path)

    if (!config.wallets || config.wallets.length === 0) {
      this.log('No wallets found')
      return {}
    }

    const availableWallets = config.wallets.map(wallet => ({
      name: wallet.name,
      path: 'path' in wallet ? wallet.path : undefined,
      publicKey: wallet.address,
      type: wallet.type || 'file',
    }))

    let selectedWallet

    if (args.name) {
      // Find wallet by name
      selectedWallet = availableWallets.find(wallet => wallet.name === args.name)

      if (!selectedWallet) {
        this.error(`Wallet with name "${args.name}" not found. Available wallets: ${availableWallets.map(w => w.name).join(', ')}`)
      }
    } else {
      // Use interactive selector — adapt for walletSelectorPrompt interface
      const promptWallets = availableWallets.map(w => ({
        name: w.type === 'asset-signer' ? `${w.name} (asset-signer)` : w.name,
        path: w.path || '',
        publicKey: w.publicKey,
      }))
      const selected = await walletSelectorPrompt(promptWallets)
      selectedWallet = availableWallets.find(w => w.publicKey === selected.publicKey)
    }

    if (!selectedWallet) {
      this.error('Failed to select wallet')
    }

    if (selectedWallet.type === 'asset-signer') {
      // For asset-signer wallets, set activeWallet name instead of keypair
      config.activeWallet = selectedWallet.name
    } else {
      // For file/ledger wallets, set keypair path and clear any active asset-signer
      if (!selectedWallet.path) {
        this.error('Wallet path is missing')
      }
      config.keypair = selectedWallet.path
      delete config.activeWallet
    }

    const dir = dirname(path)
    ensureDirectoryExists(dir)
    writeJsonSync(path, config)

    const typeLabel = selectedWallet.type === 'asset-signer' ? ' (asset-signer)' : ''
    this.log(`Selected wallet: ${selectedWallet.name}${typeLabel} (${shortenAddress(selectedWallet.publicKey)})`)

    return {
      name: selectedWallet.name,
      address: selectedWallet.publicKey,
      type: selectedWallet.type,
      ...(selectedWallet.path ? { path: selectedWallet.path } : {}),
    }
  }
}
