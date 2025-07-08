import { sol } from '@metaplex-foundation/umi'
import { IrysUploader } from '@metaplex-foundation/umi-uploader-irys'
import { Args, Flags } from '@oclif/core'
import ora from 'ora'
import { TransactionCommand } from '../../../TransactionCommand.js'

export default class ToolboxStorageWithdraw extends TransactionCommand<typeof ToolboxStorageWithdraw> {
    static override description = 'Withdraw funds from the storage account'

    static override examples = [
        '<%= config.bin %> <%= command.id %>',
    ]

    static override usage = 'toolbox storage withdraw <amount-in-sol>'

    static override args = {
        amount: Args.string({ description: 'Amount to withdraw from the storage account', required: false }),
    }

    static override flags = {
        all: Flags.boolean({ description: 'Withdraw all funds from the storage account', required: false }),
    }

    public async run() {
        const { args, flags } = await this.parse(ToolboxStorageWithdraw)

        const { umi, } = this.context

        // // Todo work out a way to fix this for multiple storage providers
        const storageProvider = umi.uploader as IrysUploader

        const withdrawSpinner = ora(`Withdrawing ${flags.all ? 'all' : args.amount} from storage account...`).start()

        if (flags.all) {
            const balance = await storageProvider.getBalance()

            await storageProvider.withdrawAll(balance)
        } else {
            await storageProvider.withdraw(sol(Number(args.amount)))
        }

        const newBalance = await storageProvider.getBalance()
        withdrawSpinner.succeed('Funds withdrawn from storage account. New balance: ' + newBalance.basisPoints)

        return
    }
}
