import {Args, Command, Flags} from '@oclif/core'
import {getDefaultConfigPath, readConfig} from '../../lib/Context.js'
import {ensureDirectoryExists, writeJsonSync} from '../../lib/file.js'
import {dirname} from 'path'

export default class ConfigSetCommand extends Command {
  static override description = 'Set a config value from a key'

  static override args = {
    key: Args.string({
      description: 'The key to set',
      required: true,
      options: ['rpcUrl', 'commitment', 'payer', 'keypair'],
    }),
    value: Args.string({description: 'The value to set', required: true}),
  }

  static override examples = [
    '<%= config.bin %> <%= command.id %> keypair /path/to/keypair.json',
    '<%= config.bin %> <%= command.id %> payer /path/to/keypair.json',
    '<%= config.bin %> <%= command.id %> rpcUrl http://localhost:8899',
    '<%= config.bin %> <%= command.id %> commitment confirmed',
  ]

  static override flags = {
    config: Flags.file({char: 'c', description: 'path to config file. Default is ~/.config/mplx/config.json'}),
  }
  public async run(): Promise<void> {
    const {flags, args} = await this.parse(ConfigSetCommand)
    const {key, value} = args

    const path = flags.config ?? getDefaultConfigPath(this.config.configDir)

    const config = readConfig(path)

    ;(config as any)[key] = value

    const dir = dirname(path)
    ensureDirectoryExists(dir)
    writeJsonSync(path, config)

    this.log(`Configuration updated: ${path}`)
  }
}
