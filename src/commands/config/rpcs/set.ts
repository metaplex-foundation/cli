import { Command, Args } from '@oclif/core'
import { getDefaultConfigPath, readConfig } from '../../../lib/Context.js'

import { dirname } from 'node:path'
import { ensureDirectoryExists, writeJsonSync } from '../../../lib/file.js'
import rpcSelector from '../../../prompts/rpcSelectorPrompt.js'

export default class ConfigRpcSetCommand extends Command {
  static override description = 'Set a new active RPC configuration from a list of RPCs. If no name is provided, opens interactive RPC selector.'

  static override args = {
    name: Args.string({ 
      description: 'Name of the RPC to set as active',
      required: false 
    })
  }

  public async run(): Promise<void> {
    const { flags, args } = await this.parse(ConfigRpcSetCommand)

    const path = flags.config ?? getDefaultConfigPath()

    const config = readConfig(path)

    if (!config.rpcs || config.rpcs.length === 0) {
      this.log('No RPCs found')
      return
    }

    const availableRpcs = config.rpcs.map(rpc => ({
      name: rpc.name,
      url: rpc.endpoint
    }))

    let selectedRpc

    if (args.name) {
      // Find RPC by name
      selectedRpc = availableRpcs.find(rpc => rpc.name === args.name)
      
      if (!selectedRpc) {
        this.error(`RPC with name "${args.name}" not found. Available RPCs: ${availableRpcs.map(r => r.name).join(', ')}`)
      }
    } else {
      // Use interactive selector
      selectedRpc = await rpcSelector(availableRpcs)
    }

    config.rpcUrl = selectedRpc.url

    const dir = dirname(path)
    ensureDirectoryExists(dir)
    writeJsonSync(path, config)

    this.log(`Selected RPC: ${selectedRpc.name} (${selectedRpc.url})`)
  }
}