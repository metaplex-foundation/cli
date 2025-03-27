import {Args, Command, Flags} from '@oclif/core'

export default class CoreCollection extends Command {
  static override description = 'MPL Core Collection Module'

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
  ]

  static override flags = {

  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(CoreCollection)

  }
}
