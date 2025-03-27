import { Args, Command, Flags } from '@oclif/core'
import { ConfigJson, getDefaultConfigPath, readConfig } from '../../lib/Context.js'

export default class ConfigGetCommand extends Command {
  static override description = 'Get a config value from a key'

  static override args = {
    key: Args.string({ description: 'The key to get', required: true, options: ['rpcUrl', 'commitment', 'payer', 'keypair'] }),
  }

  static override examples = [
    '<%= config.bin %> <%= command.id %> keypair',
    '<%= config.bin %> <%= command.id %> payer',
    '<%= config.bin %> <%= command.id %> rpcUrl',
    '<%= config.bin %> <%= command.id %> commitment'
  ]

  static override flags = {
    config: Flags.file({ char: 'c', description: 'path to config file. Default is ~/.config/mplx/config.json' }),
  }
  public async run(): Promise<ConfigJson> {
    const { flags, args } = await this.parse(ConfigGetCommand);
    const { key } = args;

    const path = flags.config ?? getDefaultConfigPath(this.config.configDir)

    const config = readConfig(path);

    this.log(`${key}: ${(config as any)[key]}`);

    return config;
  }
}