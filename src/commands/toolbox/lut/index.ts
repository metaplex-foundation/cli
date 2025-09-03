import { Command } from '@oclif/core'

export default class ToolboxLutIndex extends Command {
    static override description = 'Commands for managing Address Lookup Tables (LUTs)'

    static override examples = [
        '<%= config.bin %> <%= command.id %> create',
    ]

    async run(): Promise<void> {
        this.log('Available LUT commands:')
        this.log('  create - Create a new Address Lookup Table')
        this.log('')
        this.log('Run --help with any command for more information')
    }
}