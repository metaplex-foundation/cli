import {Command} from '@oclif/core'
import {getDefaultConfigPath, readConfig} from '../../../lib/Context.js'

export default class ConfigRpcsListCommand extends Command {
  static override description = 'List all configured RPC endpoints'

  static override examples = ['<%= config.bin %> <%= command.id %> list']

  static enableJsonFlag = true

  public async run(): Promise<unknown> {
    const {flags} = await this.parse(ConfigRpcsListCommand)

    const path = flags.config ?? getDefaultConfigPath()

    const config = readConfig(path)

    if (!config.rpcs || config.rpcs.length === 0) {
      this.log('No RPCs found')
      return { rpcs: [] }
    }

    const rpcs = config.rpcs.map(rpc => ({
      name: rpc.name,
      endpoint: rpc.endpoint,
      active: rpc.endpoint === config.rpcUrl,
    }))

    this.log('Installed RPCs:')
    for (const rpc of rpcs) {
      const marker = rpc.active ? ' (active)' : ''
      this.log(`  ${rpc.name}: ${rpc.endpoint}${marker}`)
    }

    return { rpcs }
  }
}
