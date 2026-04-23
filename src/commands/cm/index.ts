import { Command } from '@oclif/core'

export default class Cm extends Command {
  static override description = 'MPL Core Candy Machine: Create, manage, and interact with candy machines'

  static override examples = [
    '<%= config.bin %> <%= command.id %> create --wizard',
    '<%= config.bin %> <%= command.id %> upload',
    '<%= config.bin %> <%= command.id %> validate',
    '<%= config.bin %> <%= command.id %> insert',
    '<%= config.bin %> <%= command.id %> fetch',
    '<%= config.bin %> <%= command.id %> withdraw',
    '<%= config.bin %> <%= command.id %> guard update',
    '<%= config.bin %> <%= command.id %> guard remove',
    '<%= config.bin %> <%= command.id %> guard delete',
  ]

  public async run(): Promise<void> {
    // This command acts as a namespace for subcommands
    // Users should use specific subcommands like 'create', 'upload', etc.
    this.log('Available candy machine commands:')
    this.log('  create        - Create a new candy machine')
    this.log('  upload        - Upload assets to storage')
    this.log('  validate      - Validate assets and configuration')
    this.log('  insert        - Insert items into candy machine')
    this.log('  fetch         - Fetch candy machine information')
    this.log('  withdraw      - Withdraw and delete candy machine')
    this.log('  guard update  - Update guards on a candy machine')
    this.log('  guard remove  - Remove (unwrap) candy guard from a candy machine')
    this.log('  guard delete  - Delete a candy guard account and reclaim rent')
    this.log('')
    this.log('Use --help with any command for more details')
    this.log('Example: mplx cm create --help')
  }
}