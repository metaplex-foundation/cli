import {Args, Command, Flags} from '@oclif/core'

export default class Distro extends Command {
  static override description = 'MPL Distro Program - Token distribution management'

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
  ]

  static override flags = {

  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(Distro)

  }
}