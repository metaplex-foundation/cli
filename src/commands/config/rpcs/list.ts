import {Command} from '@oclif/core'
import {getDefaultConfigPath, readConfig} from '../../../lib/Context.js'

export default class ConfigRpcsListCommand extends Command {
  static override description = 'Set a config value from a key'

  static override examples = ['<%= config.bin %> <%= command.id %> list']

  public async run(): Promise<void> {
    const {flags, args} = await this.parse(ConfigRpcsListCommand)

    const path = flags.config ?? getDefaultConfigPath(this.config.configDir)

    const config = readConfig(path)

    if (!config.rpcs) {
      this.log('No RPCs found')
    } else {
      this.log('Installed RPCs:')
      console.table(config.rpcs)
    }
  }
}
