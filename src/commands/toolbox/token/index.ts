import { TransactionCommand } from '../../../TransactionCommand.js'

export default class ToolboxToken extends TransactionCommand<typeof ToolboxToken> {
    static override description = 'SPL Token tools for creating, minting, transferring, and managing fungible tokens with metadata.'

    static override examples = [
        '<%= config.bin %> <%= command.id %> create --wizard',
        '<%= config.bin %> <%= command.id %> mint <mint_address> <amount>',
        '<%= config.bin %> <%= command.id %> transfer <mint_address> <amount> <destination>',
        '<%= config.bin %> <%= command.id %> update <mint_address> --name "New Name"',
        '<%= config.bin %> <%= command.id %> add-metadata <mint_address> --name "Token" --symbol "TKN"',
    ]

    static override usage = 'toolbox token [COMMAND]'

    public async run() {
        this.log('Token Management Commands:')
        this.log('')
        this.log('Available commands:')
        this.log('  create        Create a new fungible token with metadata')
        this.log('  mint          Mint additional tokens to a wallet')
        this.log('  transfer      Transfer tokens to a destination address')
        this.log('  update        Update token metadata (name, symbol, description, image)')
        this.log('  add-metadata  Add metadata to an existing token without metadata')
        this.log('')
        this.log('Examples:')
        this.log('  mplx toolbox token create --wizard')
        this.log('  mplx toolbox token create --name "My Token" --symbol "MTK" --mint-amount 1000000')
        this.log('  mplx toolbox token mint 7EYn...qWs 1000')
        this.log('  mplx toolbox token transfer 7EYn...qWs 100 9WzD...WWM')
        this.log('  mplx toolbox token update 7EYn...qWs --name "Updated Name"')
        this.log('  mplx toolbox token add-metadata 7EYn...qWs --name "Token" --symbol "TKN"')
        this.log('')
        this.log('Use "mplx toolbox token [command] --help" for more information about a specific command.')
    }
}