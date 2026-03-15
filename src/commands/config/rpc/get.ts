import {Command} from '@oclif/core'
import {getDefaultConfigPath, readConfig} from '../../../lib/Context.js'

export default class ConfigRpcsGetCommand extends Command {
  static override description = 'Get the active RPC endpoint'

  static override examples = ['<%= config.bin %> <%= command.id %>']

  static enableJsonFlag = true

  public async run(): Promise<unknown> {
    const {flags} = await this.parse(ConfigRpcsGetCommand)

    const path = flags.config ?? getDefaultConfigPath()

    const config = readConfig(path)

    const activeRpc = config.rpcs?.find(rpc => rpc.endpoint === config.rpcUrl)

    if (activeRpc) {
      this.log(`Active RPC: ${activeRpc.name} (${activeRpc.endpoint})`)
      return { name: activeRpc.name, endpoint: activeRpc.endpoint }
    }

    if (config.rpcUrl) {
      this.log(`Active RPC: ${config.rpcUrl}`)
      return { endpoint: config.rpcUrl }
    }

    this.log('No active RPC configured')
    return {}
  }
}
