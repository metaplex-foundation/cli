import {Command} from '@oclif/core'
import {getDefaultConfigPath, readConfig} from '../../../lib/Context.js'

import {dirname} from 'path'
import {ensureDirectoryExists, writeJsonSync} from '../../../lib/file.js'
import rpcSelector from '../../../prompts/rpcSelectorPrompt.js'

export default class ConfigRpcSetCommand extends Command {
  static override description = 'Set a new active wallet from a list of wallets'

  public async run(): Promise<void> {
    const {flags, args} = await this.parse(ConfigRpcSetCommand)

    const path = flags.config ?? getDefaultConfigPath(this.config.configDir)

    const config = readConfig(path)

    if (!config.rpcs || config.rpcs.length === 0) {
      this.log('No RCPs found')
      return
    }

    const selectedRpc = await rpcSelector(config.rpcs)

    config.rpcUrl = selectedRpc.endpoint

    const dir = dirname(path)
    ensureDirectoryExists(dir)
    writeJsonSync(path, config)

    this.log(`Active RPC set to  ${selectedRpc.name + ' ' + selectedRpc.endpoint}`)
  }
}
