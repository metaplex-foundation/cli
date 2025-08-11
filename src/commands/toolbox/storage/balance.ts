import { IrysUploader } from '@metaplex-foundation/umi-uploader-irys'
import { TransactionCommand } from '../../../TransactionCommand.js'
import { jsonStringify } from '../../../lib/util.js'

export default class ToolboxStorageBalance extends TransactionCommand<typeof ToolboxStorageBalance> {
    static override description = 'Get the balance of the storage account'

    static override examples = [
        '<%= config.bin %> <%= command.id %>',
    ]

    static override usage = 'toolbox storage balance'

    public async run() {
        const { args, flags } = await this.parse(ToolboxStorageBalance)

        const { umi, } = this.context

        // TODO work out a way to fix this for multiple storage providers
        // might require a change to the umi uploader interface default exported functions
        const storageProvider = umi.uploader as IrysUploader

        const balance = await storageProvider.getBalance()

        this.log(jsonStringify(balance, 2))

    }
}
