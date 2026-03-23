import { Command } from '@oclif/core'

export default class ConfigStorage extends Command {
  static override description = 'Manage the active storage provider'

  static override examples = [
    '<%= config.bin %> <%= command.id %> set',
  ]

  public async run(): Promise<void> {
    this.log(`
Storage Commands:

  set  Set the active storage provider (Irys, Arweave Turbo, etc.)

Use "mplx config storage set --help" for more information.
`)
  }
}
