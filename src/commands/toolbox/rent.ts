import { Args, Flags } from '@oclif/core'

import { amountToNumber, subtractAmounts } from '@metaplex-foundation/umi'
import { TransactionCommand } from '../../TransactionCommand.js'


export default class ToolboxRent extends TransactionCommand<typeof ToolboxRent> {
    static override description = 'Get rent cost for a given number of bytes'

    static override examples = [
        '<%= config.bin %> <%= command.id %> <bytes>',
    ]

    static override flags = {
        // Ignore the 128 byte header for the rent cost
        noHeader: Flags.boolean({ description: 'Ignore the 128 byte header for the rent cost', default: false }),
        // Flag to display the rent cost in Lamports
        lamports: Flags.boolean({ description: 'Display the rent cost in Lamports', default: false }),
    }

    static override args = {
        bytes: Args.integer({ description: 'Number of bytes', required: true }),
    }


    public async run() {
        const { args, flags } = await this.parse(ToolboxRent)

        const { umi } = this.context

        let rent = await umi.rpc.getRent(args.bytes)
        if (flags.noHeader) {
            rent = subtractAmounts(rent, await umi.rpc.getRent(0));
        }

        if (flags.lamports) {
            this.logSuccess(
                `--------------------------------
    Rent cost for ${args.bytes} bytes is ${rent.basisPoints} lamports
--------------------------------`
            )
        }
        else {
            this.logSuccess(
                `--------------------------------
    Rent cost for ${args.bytes} bytes is ${amountToNumber(rent)} SOL
--------------------------------`
            )
        }
    }
}
