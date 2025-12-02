import { Args } from '@oclif/core'

import { transferSol } from '@metaplex-foundation/mpl-toolbox'
import { publicKey, sol } from '@metaplex-foundation/umi'
import ora from 'ora'
import { TransactionCommand } from '../../../TransactionCommand.js'
import umiSendAndConfirmTransaction from '../../../lib/umi/sendAndConfirm.js'
import { txSignatureToString } from '../../../lib/util.js'



export default class ToolboxSolTransfer extends TransactionCommand<typeof ToolboxSolTransfer> {
    static override description = 'Transfer SOL to an address'

    static override examples = [
        '<%= config.bin %> <%= command.id %> 1 11111111111111111111111111111111',
        '<%= config.bin %> <%= command.id %> 0.5 11111111111111111111111111111111',
        '<%= config.bin %> <%= command.id %> 1.25 11111111111111111111111111111111',
    ]

    static override usage = 'toolbox sol transfer [FLAGS]'

    static override args = {
        amount: Args.string({ description: 'Amount of SOL to transfer', required: true }),
        address: Args.string({ description: 'Address to transfer SOL to', required: true }),
    }


    public async run(): Promise<string> {
        const { args } = await this.parse(ToolboxSolTransfer)

        const { umi } = this.context

        const spinner = ora('Transferring SOL...').start()

        const amountInSol = parseFloat(args.amount)
        if (isNaN(amountInSol) || amountInSol <= 0) {
            throw new Error('Amount must be a positive number')
        }

        const tx = transferSol(umi, {
            destination: publicKey(args.address),
            amount: sol(amountInSol)
        })

        const result = await umiSendAndConfirmTransaction(umi, tx).catch((err) => {
            spinner.fail('Failed to transfer SOL')
            console.error(err)
            throw err
        })

        spinner.succeed('SOL transferred successfully')

        this.logSuccess(
            `--------------------------------
    Transferred ${amountInSol} SOL to ${args.address}
    Signature: ${txSignatureToString(result.transaction.signature as Uint8Array)}
--------------------------------`
        )

        return 'success'

    }
}
