import {Args, Command} from '@oclif/core'
import fs from 'fs'
import {dirname} from 'path'
import {createSignerFromPath, getDefaultConfigPath, readConfig} from '../../../lib/Context.js'
import {ensureDirectoryExists, writeJsonSync} from '../../../lib/file.js'
import {shortenAddress} from '../../../lib/util.js'

export default class ConfigRPCAddCommand extends Command {
  static enableJsonFlag = true

  static override description = 'Add a new RPC endpoint to your configuration'

  static override args = {
    name: Args.string({
      description: 'Name of RPC (no spaces allowed)',
      required: true,
    }),
    endpoint: Args.string({description: 'RPC endpoint URL', required: true}),
  }

  static override examples = [
    '<%= config.bin %> <%= command.id %> myRpc https://api.devnet.solana.com',
    '<%= config.bin %> <%= command.id %> mainnet https://api.mainnet-beta.solana.com',
  ]

  public async run(): Promise<unknown> {
    const {flags, args} = await this.parse(ConfigRPCAddCommand)

    // Validate name (removed character limit for MCP compatibility)

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

    this.log(`RPC '${args.name}' added to config.`)

    return {
      name: args.name,
      endpoint: args.endpoint,
    }
  }
}
