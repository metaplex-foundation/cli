import { Command } from '@oclif/core'

export default class Resize extends Command {
  static override description = 'MPL Resize Program - Token distribution management'

  static override examples = [
    '<%= config.bin %> resize create --config ./distribution-config.json',
    '<%= config.bin %> resize fetch DistroAddress123...',
    '<%= config.bin %> resize deposit ResizeAddress123... --amount 1000000',
    '<%= config.bin %> resize withdraw ResizeAddress123... --amount 500000',
  ]

  public async run(): Promise<void> {
    await this.parse(Resize)
    
    // Display available commands
    this.log('MPL Resize Program - Token distribution management')
    this.log('')
    this.log('Available commands:')
    this.log('  resize create    Create a new token distribution')
    this.log('  resize fetch     Fetch a distribution by address')
    this.log('  resize deposit   Deposit tokens into a distribution')
    this.log('  resize withdraw  Withdraw tokens from a distribution')
    this.log('')
    this.log('Run "mplx resize <command> --help" for more information about a command.')
  }
}