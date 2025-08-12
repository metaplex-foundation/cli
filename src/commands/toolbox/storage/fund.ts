import { sol } from '@metaplex-foundation/umi'
import { IrysUploader } from '@metaplex-foundation/umi-uploader-irys'
import { Args } from '@oclif/core'
import ora from 'ora'
import { TransactionCommand } from '../../../TransactionCommand.js'

export default class ToolboxStorageFund extends TransactionCommand<typeof ToolboxStorageFund> {
    static override description = 'Fund the storage account with the specified amount of SOL'

    static override examples = [
        '<%= config.bin %> <%= command.id %>',
    ]

    static override usage = 'toolbox storage fund <amount-in-sol>'

    static override args = {
        amount: Args.string({ description: 'Amount to fund the storage account', required: true }),
    }

    public async run() {
        const { args, flags } = await this.parse(ToolboxStorageFund)

        const { umi, } = this.context

        // // Todo work out a way to fix this for multiple storage providers
        const storageProvider = umi.uploader as IrysUploader

        const fundingSpinner = ora('Funding storage account...').start()

        const res = await storageProvider.fund(sol(Number(args.amount)), true)

        const balance = await storageProvider.getBalance()

        fundingSpinner.succeed(`Storage account funded new balance: ${balance.basisPoints}`)

        return
    }
}
