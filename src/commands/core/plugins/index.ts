import { Command } from '@oclif/core'
import { BaseCommand } from '../../../BaseCommand.js'

export default class CorePlugins extends BaseCommand<typeof CorePlugins> {
  static override description = 'MPL Core Plugins Module'

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
  ]

  static override flags = {

  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(CorePlugins)

  }
}
