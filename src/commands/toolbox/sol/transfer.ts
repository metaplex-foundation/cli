import { Args } from '@oclif/core'

import { transferSol } from '@metaplex-foundation/mpl-toolbox'
import { publicKey, sol } from '@metaplex-foundation/umi'
import { base58 } from '@metaplex-foundation/umi/serializers'
import ora from 'ora'
import { TransactionCommand } from '../../../TransactionCommand.js'
import umiSendAndConfirmTransaction from '../../../lib/umi/sendAndConfirm.js'
import { txSignatureToString } from '../../../lib/util.js'



/* 
  Create Possibilities:

  1. Create a single Asset by providing the name and URI of the metadata.

  2. Create a single Asset by providing an image file to upload and a JSON file to upload and assign to the Asset.

  3. Create multiple Assets by providing a folder path with JSON files named sequentially ie (1.json, 2.json, 3.json) containing the offchain metadata.

  4. Create multiple Assets by providing a folder path both JSON files and image files named sequentially ie (1.json, 1.png, 2.json, 2.png, 3.json, 3.png) to upload and assign to the Assets.

  TODO - For single Asset creation, allow for the user to mint multiple copies of the same Asset via a flag(s).

*/

export default class ToolboxSolTransfer extends TransactionCommand<typeof ToolboxSolTransfer> {
    static override description = 'Transfer SOL to an address'

    static override examples = [
        '<%= config.bin %> <%= command.id %> toolbox sol transfer 1 11111111111111111111111111111111',
    ]

    static override usage = 'toolbox sol transfer [FLAGS]'

    static override args = {
        amount: Args.integer({ description: 'Amount of SOL to transfer', required: true }),
        address: Args.string({ description: 'Address to transfer SOL to', required: true }),
    }


    public async run(): Promise<string> {
        const { args, flags } = await this.parse(ToolboxSolTransfer)

        const { umi } = this.context

        const spinner = ora('Transferring SOL...').start()

        const tx = transferSol(umi, {
            destination: publicKey(args.address),
            amount: sol(args.amount)
        })

        const result = await umiSendAndConfirmTransaction(umi, tx).catch((err) => {
            spinner.fail('Failed to transfer SOL')
            console.error(err)
            throw err
        })

        spinner.succeed('SOL transferred successfully')

        this.logSuccess(
            `--------------------------------
    Transferred ${args.amount} SOL to ${args.address}
    Signature: ${txSignatureToString(result.transaction.signature as Uint8Array)}
--------------------------------`
        )

        return 'success'

    }
}
