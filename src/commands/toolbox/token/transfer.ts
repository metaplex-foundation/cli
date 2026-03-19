import { Args } from '@oclif/core'

import { createTokenIfMissing, findAssociatedTokenPda, transferTokens } from '@metaplex-foundation/mpl-toolbox'
import { publicKey, TransactionBuilder } from '@metaplex-foundation/umi'
import ora from 'ora'
import { generateExplorerUrl } from '../../../explorers.js'
import umiSendAndConfirmTransaction from '../../../lib/umi/sendAndConfirm.js'
import { TransactionCommand } from '../../../TransactionCommand.js'
import { txSignatureToString } from '../../../lib/util.js'

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
        amount: Args.integer({ description: 'Amount to transfer in smallest unit (e.g., if decimals = 2, amount 100 represents 1 token)', required: true }),
        destination: Args.string({ description: 'Destination wallet address', required: true }),
    }


    public async run(): Promise<unknown> {
        const { args, flags } = await this.parse(ToolboxTokenTransfer)

        const { umi, explorer, chain } = this.context



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
            source: findAssociatedTokenPda(umi, { mint: publicKey(args.mintAddress), owner: umi.identity.publicKey }),
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

        const signature = txSignatureToString(result.transaction.signature as Uint8Array)
        const explorerUrl = generateExplorerUrl(explorer, chain, signature, 'transaction')

        this.logSuccess(
            `--------------------------------
    Tokens Transferred Successfully!
    Mint: ${args.mintAddress}
    Destination: ${args.destination}
    Amount: ${args.amount}
    Signature: ${signature}
    Explorer: ${explorerUrl}
--------------------------------`
        )

        return {
            mint: args.mintAddress,
            destination: args.destination,
            amount: args.amount,
            signature,
            explorer: explorerUrl,
        }
    }


}
