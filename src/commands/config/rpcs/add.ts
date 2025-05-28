import {Args, Command} from '@oclif/core'
import fs from 'fs'
import {dirname} from 'path'
import {createSignerFromPath, getDefaultConfigPath, readConfig} from '../../../lib/Context.js'
import {ensureDirectoryExists, writeJsonSync} from '../../../lib/file.js'
import {shortenAddress} from '../../../lib/util.js'

export default class ConfigRPCAddCommand extends Command {
  static override description = 'Set a config value from a key'

  static override args = {
    name: Args.string({
      description: 'Name of wallet (max 6 characters and no spaces)',
      required: true,
    }),
    endpoint: Args.string({description: 'Path to keypair json file', required: true}),
  }

  static override examples = [
    '<%= config.bin %> <%= command.id %> add dev1 /path/to/keypair.json',
    '<%= config.bin %> <%= command.id %> set dev1',
    '<%= config.bin %> <%= command.id %> remove dev1',
  ]

  public async run(): Promise<void> {
    const {flags, args} = await this.parse(ConfigRPCAddCommand)

    // Validate name

    if (args.name.length > 15) {
      this.error('Name must be 20 characters or less')
    }

    if (args.name.includes(' ')) {
      this.error('Name must not contain spaces')
    }

    const path = flags.config ?? getDefaultConfigPath()

    const config = readConfig(path)

    if (!config.rpcs) {
      config.rpcs = []
    } else {
      const existingName = config.rpcs.find((rpc) => rpc.name === args.name)
      if (existingName) {
        this.error(`RPC with name ${args.name} already exists`)
      }

      const existingEndpoint = config.rpcs.find((rpc) => rpc.endpoint === args.endpoint)
      if (existingEndpoint) {
        this.error(`RPC with endpoint ${args.endpoint} already exists`)
      }
    }

    config.rpcs?.push({
      name: args.name,
      endpoint: args.endpoint,
    })

    const dir = dirname(path)
    ensureDirectoryExists(dir)
    writeJsonSync(path, config)

    this.log(`RPC ${''} added to config.`)
  }
}
