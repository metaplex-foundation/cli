import { Args } from '@oclif/core'

import { createTokenIfMissing, findAssociatedTokenPda, transferTokens } from '@metaplex-foundation/mpl-toolbox'
import { publicKey, TransactionBuilder } from '@metaplex-foundation/umi'
import { base58 } from '@metaplex-foundation/umi/serializers'
import ora from 'ora'
import umiSendAndConfirmTransaction from '../../../lib/umi/sendAndConfirm.js'
import { TransactionCommand } from '../../../TransactionCommand.js'

/*
  Transfer tokens from the payer's wallet to a destination address.
  If the destination wallet doesn't have a token account, it will be created automatically.
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
