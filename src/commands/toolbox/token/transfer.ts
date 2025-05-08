import { Args } from '@oclif/core'

import { createTokenIfMissing, findAssociatedTokenPda, transferTokens } from '@metaplex-foundation/mpl-toolbox'
import { publicKey, TransactionBuilder } from '@metaplex-foundation/umi'
import { base58 } from '@metaplex-foundation/umi/serializers'
import ora from 'ora'
import umiSendAndConfirmTransaction from '../../../lib/umi/sendAndConfirm.js'
import { TransactionCommand } from '../../../TransactionCommand.js'

/* 
  Create Possibilities:

  1. Create a single Asset by providing the name and URI of the metadata.

  2. Create a single Asset by providing an image file to upload and a JSON file to upload and assign to the Asset.

  3. Create multiple Assets by providing a folder path with JSON files named sequentially ie (1.json, 2.json, 3.json) containing the offchain metadata.

  4. Create multiple Assets by providing a folder path both JSON files and image files named sequentially ie (1.json, 1.png, 2.json, 2.png, 3.json, 3.png) to upload and assign to the Assets.

  TODO - For single Asset creation, allow for the user to mint multiple copies of the same Asset via a flag(s).

*/

export default class ToolboxTokenTransfer extends TransactionCommand<typeof ToolboxTokenTransfer> {
    static override description = 'Transfer tokens to a destination address'

    static override examples = [
        '<%= config.bin %> <%= command.id %> toolbox token transfer <mintAddress> <amount>',
    ]

    static override usage = 'toolbox token transfer [ARGS]'

    static override args = {
        mintAddress: Args.string({ description: 'Mint address of the token', required: true }),
        amount: Args.integer({ description: 'Amount of tokens to transfer in basis points', required: true }),
        destination: Args.string({ description: 'Destination wallet address', required: true }),
    }


    public async run() {
        const { args, flags } = await this.parse(ToolboxTokenTransfer)

        const { umi } = this.context



        this.logSuccess(
            `--------------------------------
    
    Token Transfer         
                
--------------------------------`
        )

        const createTokenIfMissingIx = createTokenIfMissing(umi, {
            mint: publicKey(args.mintAddress),
            owner: publicKey(args.destination),
        })

        const transferTokenIx = transferTokens(umi, {
            source: findAssociatedTokenPda(umi, { mint: publicKey(args.mintAddress), owner: umi.payer.publicKey }),
            destination: findAssociatedTokenPda(umi, { mint: publicKey(args.mintAddress), owner: publicKey(args.destination) }),
            amount: args.amount
        })

        const transaction = new TransactionBuilder().add(createTokenIfMissingIx).add(transferTokenIx)


        const transferSpinner = ora('Transferring tokens...').start()
        const result = await umiSendAndConfirmTransaction(umi, transaction)
            .catch((err) => {
                transferSpinner.fail('Failed to transfer token')
                throw err
            })
        transferSpinner.succeed('Tokens Transferred Successfully!')

        this.logSuccess(
            `--------------------------------
    'Tokens Transferred Successfully!'
    Signature: ${base58.deserialize(result.transaction.signature as Uint8Array)[0]}
--------------------------------`
        )

    }


}
