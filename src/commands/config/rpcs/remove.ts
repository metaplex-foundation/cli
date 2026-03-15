import {Args, Command} from '@oclif/core'
import {dirname} from 'path'
import {getDefaultConfigPath, readConfig} from '../../../lib/Context.js'
import {ensureDirectoryExists, writeJsonSync} from '../../../lib/file.js'

export default class ConfigRpcRemoveCommand extends Command {
  static enableJsonFlag = true

  static override description = 'Remove an RPC from the config'

  static override args = {
    name: Args.string({
      description: 'Name of RPC to remove from config',
      required: true,
    }),
  }

  static override examples = ['<%= config.bin %> <%= command.id %> remove dev1']

  public async run(): Promise<unknown> {
    const {flags, args} = await this.parse(ConfigRpcRemoveCommand)

    const path = flags.config ?? getDefaultConfigPath()

    const config = readConfig(path)

    // find and remove wallet by name

    if (!config.rpcs) {
      this.log('No RPCs found')
      return {}
    }

    const existingName = config.rpcs.find((rpc) => rpc.name === args.name)
    if (!existingName) {
      this.error(`RPC with name ${args.name} does not exist`)
    }
    config.rpcs = config.rpcs.filter((rpc) => rpc.name !== args.name)
    this.log(`RPC ${args.name} removed from config.`)

    const dir = dirname(path)
    ensureDirectoryExists(dir)
    writeJsonSync(path, config)

    return { name: args.name }
  }
}
