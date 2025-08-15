import { Command } from '@oclif/core'

export default class Distro extends Command {
  static override description = 'MPL Distro Program - Token distribution management'

  static override examples = [
    '<%= config.bin %> distro create --config ./distribution-config.json',
    '<%= config.bin %> distro deposit DistroAddress123... --amount 1000000',
    '<%= config.bin %> distro withdraw DistroAddress123... --amount 500000',
  ]

  public async run(): Promise<void> {
    await this.parse(Distro)
    
    // Display available commands
    this.log('MPL Distro Program - Token distribution management')
    this.log('')
    this.log('Available commands:')
    this.log('  distro create    Create a new token distribution')
    this.log('  distro deposit   Deposit tokens into a distribution')
    this.log('  distro withdraw  Withdraw tokens from a distribution')
    this.log('')
    this.log('Run "mplx distro <command> --help" for more information about a command.')
  }
}