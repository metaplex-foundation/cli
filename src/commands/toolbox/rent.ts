import { Args } from '@oclif/core'

import { amountToNumber } from '@metaplex-foundation/umi'
import { TransactionCommand } from '../../TransactionCommand.js'


export default class ToolboxSolBalance extends TransactionCommand<typeof ToolboxSolBalance> {
    static override description = 'Airdrop SOL to an address'

    static override examples = [
        '<%= config.bin %> <%= command.id %> <bytes>',
    ]

    static override args = {
        bytes: Args.integer({ description: 'Number of bytes', required: true }),
    }


    public async run() {
        const { args } = await this.parse(ToolboxSolBalance)

        const { umi } = this.context

        const rent = await umi.rpc.getRent(args.bytes)

        this.logSuccess(
            `--------------------------------
    Rent cost for ${args.bytes} bytes is ${amountToNumber(rent)} SOL
--------------------------------`
        )
    }
}
