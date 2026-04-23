import { Command } from '@oclif/core'

export default class CmGuard extends Command {
  static override description = 'Manage candy machine guards'

  static override examples = [
    '<%= config.bin %> <%= command.id %> update',
    '<%= config.bin %> <%= command.id %> remove',
    '<%= config.bin %> <%= command.id %> delete',
  ]

  public async run(): Promise<void> {
    this.log('Available candy machine guard commands:')
    this.log('  update  - Update guards on a candy machine')
    this.log('  remove  - Remove (unwrap) the candy guard from a candy machine')
    this.log('  delete  - Delete a candy guard account and reclaim rent')
    this.log('')
    this.log('Use --help with any command for more details')
    this.log('Example: mplx cm guard update --help')
  }
}
