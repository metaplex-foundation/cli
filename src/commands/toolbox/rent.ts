import { Args, Flags } from '@oclif/core'

import { amountToNumber, subtractAmounts } from '@metaplex-foundation/umi'
import { BaseCommand } from '../../BaseCommand.js'

export default class ToolboxRent extends BaseCommand<typeof ToolboxRent> {
  static override description = 'Get rent cost for a given number of bytes'

  static override examples = ['<%= config.bin %> <%= command.id %> <bytes>']

    static override flags = {
        // Ignore the 128 byte header for the rent cost
        noHeader: Flags.boolean({ description: 'Ignore the 128 byte header for the rent cost', default: false }),
        // Flag to display the rent cost in Lamports
        lamports: Flags.boolean({ description: 'Display the rent cost in Lamports', default: false }),
    }

    static override args = {
        bytes: Args.integer({ description: 'Number of bytes', required: true }),
    }

    public async run(): Promise<unknown> {
        const { args, flags } = await this.parse(ToolboxRent)

        const { umi } = this.context

        let rent = await umi.rpc.getRent(args.bytes)
        if (flags.noHeader) {
            rent = subtractAmounts(rent, await umi.rpc.getRent(0));
        }

        const rentSol = amountToNumber(rent)
        const rentLamports = Number(rent.basisPoints)

        if (flags.lamports) {
            this.logSuccess(
                `--------------------------------
    Rent cost for ${args.bytes} bytes is ${rentLamports} lamports
--------------------------------`
            )
        }
        else {
            this.logSuccess(
                `--------------------------------
    Rent cost for ${args.bytes} bytes is ${rentSol} SOL
--------------------------------`
            )
        }

        return {
            bytes: args.bytes,
            rentSol,
            rentLamports,
        }
    }
}
