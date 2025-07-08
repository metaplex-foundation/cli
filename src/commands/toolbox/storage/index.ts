import { Command } from '@oclif/core'

export default class ToolboxStorage extends Command {
    static override description = 'Storage management commands for various providers (Irys, etc.)'

    static override examples = [
        '<%= config.bin %> <%= command.id %> fund <amount>',
        '<%= config.bin %> <%= command.id %> balance',
        '<%= config.bin %> <%= command.id %> withdraw <amount>',
    ]

    static override usage = 'toolbox storage [COMMAND]'

    public async run() {
        this.log('Storage Management Commands:')
        this.log('')
        this.log('Available commands:')
        this.log('  fund <amount>     Fund your storage account with SOL')
        this.log('  balance           Check your storage account balance') 
        this.log('  withdraw <amount> Withdraw SOL from your storage account')
        this.log('')
        this.log('Examples:')
        this.log('  mplx toolbox storage fund 0.1')
        this.log('  mplx toolbox storage balance')
        this.log('  mplx toolbox storage withdraw 0.05')
        this.log('')
        this.log('Use "mplx toolbox storage [command] --help" for more information about a specific command.')
    }
}
