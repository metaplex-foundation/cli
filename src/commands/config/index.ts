import { Command, Flags } from '@oclif/core'
import { CONFIG_KEYS, ConfigJson, DEFAULT_CONFIG, getDefaultConfigPath, readConfig } from '../../lib/Context.js'
import { existsSync } from 'fs'

export default class Config extends Command {
  static override description = 'Show the current config'

  static override examples = ['<%= config.bin %> <%= command.id %>']

  static override flags = {
    config: Flags.file({ char: 'c', description: 'path to config file. Default is ~/.config/mplx/config.json' }),
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(Config)
    const path = flags.config ?? getDefaultConfigPath(this.config.configDir)

    const config = readConfig(path)
    if (!existsSync(path)) {
      this.log(`Config file not found at: ${path}, using defaults`)
    } else {
      this.log(`Found config at: ${path}`)
      CONFIG_KEYS.forEach((key) => {
        this.log(`${key}: ${config[key]}`)
      })
    }

    // this.log('----------------------------')
    // this.log('Derived config:')
    // const derivedConfig = {
    //   ...DEFAULT_CONFIG,
    //   ...config,
    // }

    // CONFIG_KEYS.forEach((key) => {
    //   this.log(`${key}: ${derivedConfig[key]}`)
    // })
  }
}
