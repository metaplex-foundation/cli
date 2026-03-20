import { Command, Flags } from '@oclif/core'
import { CONFIG_KEYS, ConfigJson, DEFAULT_CONFIG, getDefaultConfigPath, readConfig } from '../../lib/Context.js'
import { existsSync } from 'fs'
import ansis from 'ansis'

export default class Config extends Command {
  static override description = 'Show the current config'

  static override examples = ['<%= config.bin %> <%= command.id %>']

  static override flags = {
    config: Flags.file({ char: 'c', description: 'path to config file. Default is ~/.config/mplx/config.json' }),
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(Config)
    const path = flags.config ?? getDefaultConfigPath()

    const config = readConfig(path)
    if (!existsSync(path)) {
      this.log(ansis.yellow(`Config file not found at: ${path}, using defaults`))
    } else {
      this.log(ansis.green(`Found config at: ${ansis.bold(path)}`))
      this.log('')

      // prints the config and expands [object Object] while adding some defining colors

      CONFIG_KEYS.forEach((key) => {
        const value = config[key]
        if (typeof value === 'object' && value !== null) {
          this.log(ansis.cyan(`${key}:`))
          Object.entries(value).forEach(([k, v]) => {
            const formattedValue = typeof v === 'string' ? 
              ansis.green(`"${v}"`) : 
              ansis.yellow(JSON.stringify(v))
            this.log(`  ${ansis.dim(k)}: ${formattedValue}`)
          })
        } else {
          const formattedValue = value === undefined ? 
            ansis.gray('undefined') : 
            ansis.green(value)
          this.log(`${ansis.cyan(key)}: ${formattedValue}`)
        }
        this.log('')
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
