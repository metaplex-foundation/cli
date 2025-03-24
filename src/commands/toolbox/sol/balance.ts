import { Args } from '@oclif/core'

import { amountToNumber, publicKey } from '@metaplex-foundation/umi'
import { TransactionCommand } from '../../../TransactionCommand.js'
import { shortenAddress } from '../../../lib/util.js'

export default class ToolboxSolBalance extends TransactionCommand<typeof ToolboxSolBalance> {
    static override description = 'Airdrop SOL to an address'

    static override examples = [
        '<%= config.bin %> <%= command.id %> <address>',
    ]

    static override usage = 'toolbox sol balance [ARGS]'

    static override args = {
        address: Args.string({ description: 'Address to airdrop SOL to', required: false }),
    }


    public async run() {
        const { args } = await this.parse(ToolboxSolBalance)

        const { umi } = this.context

        const address = args.address ? publicKey(args.address) : umi.identity.publicKey

        const balance = await umi.rpc.getBalance(address)

        this.logSuccess(
            `--------------------------------
    SOL balance for ${shortenAddress(address)}: ${amountToNumber(balance)}
--------------------------------`
        )
    }
}
