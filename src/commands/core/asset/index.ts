import { Command } from '@oclif/core'

export default class CoreAsset extends Command {
  static override description = 'MPL Core Asset Module'

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
  ]

  static override flags = {

  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(CoreAsset)

  }
}
