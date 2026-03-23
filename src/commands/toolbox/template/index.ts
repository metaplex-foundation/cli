import { Command } from '@oclif/core'

export default class ToolboxTemplate extends Command {
  static override description = 'Download starter templates for programs and websites'

  static override examples = [
    '<%= config.bin %> <%= command.id %> program',
    '<%= config.bin %> <%= command.id %> website',
  ]

  public async run(): Promise<void> {
    this.log(`
Template Commands:

  program  Download a MPLX program template
  website  Download a MPLX website template

Use "mplx toolbox template [command] --help" for more information about a specific command.
`)
  }
}
