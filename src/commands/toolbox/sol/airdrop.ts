import { Args } from '@oclif/core'

import ora from 'ora'
import { TransactionCommand } from '../../../TransactionCommand.js'
import umiAirdrop from '../../../lib/toolbox/airdrop.js'



/* 
  Create Possibilities:

  1. Create a single Asset by providing the name and URI of the metadata.

  2. Create a single Asset by providing an image file to upload and a JSON file to upload and assign to the Asset.

  3. Create multiple Assets by providing a folder path with JSON files named sequentially ie (1.json, 2.json, 3.json) containing the offchain metadata.

  4. Create multiple Assets by providing a folder path both JSON files and image files named sequentially ie (1.json, 1.png, 2.json, 2.png, 3.json, 3.png) to upload and assign to the Assets.

  TODO - For single Asset creation, allow for the user to mint multiple copies of the same Asset via a flag(s).

*/

export default class ToolboxSolAirdrop extends TransactionCommand<typeof ToolboxSolAirdrop> {
    static override description = 'Airdrop SOL to an address'

    static override examples = [
        '<%= config.bin %> <%= command.id %> toolbox sol airdrop 1',
        '<%= config.bin %> <%= command.id %> toolbox sol airdrop 1 <address>',
    ]

    static override usage = 'toolbox sol airdrop [ARGS]'

    static override args = {
        amount: Args.integer({ description: 'Amount of SOL to airdrop', required: true }),
        address: Args.string({ description: 'Address to airdrop SOL to', required: false }),
    }


    public async run() {
        const { args, flags } = await this.parse(ToolboxSolAirdrop)

        const { umi } = this.context

        const spinner = ora('Airdropping SOL...').start()

        await umiAirdrop(umi, args.amount, args.address).catch((err) => {
            spinner.fail('Failed to airdrop SOL')
            console.error(err)
            throw err
        })

        spinner.succeed('Airdropped SOL successfully')

        this.logSuccess(
            `--------------------------------
    Airdropped ${args.amount} SOL to ${args.address}
--------------------------------`
        )
    }
}
