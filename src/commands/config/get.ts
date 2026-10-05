import { Args, Command, Flags } from '@oclif/core'
import { getDefaultConfigPath, readConfig } from '../../lib/Context.js'

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

  static enableJsonFlag = true

  static override flags = {
    config: Flags.file({ char: 'c', description: 'path to config file. Default is ~/.config/mplx/config.json' }),
  }
  public async run(): Promise<{ key: string; value: unknown }> {
    const { flags, args } = await this.parse(ConfigGetCommand);
    const { key } = args;

    const path = flags.config ?? getDefaultConfigPath()

    const config = readConfig(path);

    const value = (config as any)[key];

    this.log(`${key}: ${value}`);

    return { key, value };
  }
}