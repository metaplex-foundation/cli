import { Args, Flags } from '@oclif/core'
import { createTokenIfMissing, findAssociatedTokenPda, mintTokensTo } from '@metaplex-foundation/mpl-toolbox'
import { publicKey } from '@metaplex-foundation/umi'
import ora from 'ora'
import { TransactionCommand } from '../../../TransactionCommand.js'
import { ExplorerType, generateExplorerUrl } from '../../../explorers.js'
import umiSendAndConfirmTransaction from '../../../lib/umi/sendAndConfirm.js'
import { getEffectiveOwner } from '../../../lib/umi/assetSignerPlugin.js'
import { RpcChain, txSignatureToString } from '../../../lib/util.js'

const SUCCESS_MESSAGE = async (
    chain: RpcChain,
    mint: string,
    recipient: string,
    amount: number,
    signature: string,
    options: { explorer: ExplorerType }
) => {
    return `--------------------------------
Tokens minted successfully!

Mint Details:
Mint Address: ${mint}
Recipient: ${recipient}
Amount Minted: ${amount}

Transaction Signature: ${signature}
Explorer: ${generateExplorerUrl(options.explorer, chain, signature, 'transaction')}
--------------------------------`;
}

export default class ToolboxTokenMint extends TransactionCommand<typeof ToolboxTokenMint> {
    static override description = `Mint additional tokens to a recipient's wallet.

By default, tokens are minted to the current keypair's wallet. You can specify a different recipient using the --recipient flag.

The command requires:
- mint: The address of the token mint to create tokens for
- amount: The number of tokens to mint
- recipient (optional): The wallet address to receive the tokens (defaults to current keypair)

Note: You must have mint authority for the specified token mint.`

    static override examples = [
        '<%= config.bin %> <%= command.id %> 7EYnhQoR9YM3c7UoaKRoA4q6YQ2Jx4VvQqKjB5x8XqWs 1000',
        '<%= config.bin %> <%= command.id %> 7EYnhQoR9YM3c7UoaKRoA4q6YQ2Jx4VvQqKjB5x8XqWs 1000 --recipient 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
    ]

    static override usage = 'toolbox token mint <MINT_ADDRESS> <AMOUNT> [--recipient <RECIPIENT_ADDRESS>]'

    static override args = {
        mint: Args.string({
            description: 'The mint address of the token to mint additional tokens for',
            required: true,
        }),
        amount: Args.integer({
            description: 'The number of tokens to mint (must be greater than 0)',
            required: true,
        }),
    }

    static override flags = {
        recipient: Flags.string({
            description: 'The wallet address to receive the minted tokens (defaults to current keypair)',
            required: false,
        }),
    }

    public async run(): Promise<unknown> {
        const { args, flags } = await this.parse(ToolboxTokenMint)
        const { umi, explorer } = this.context

        // Validate amount
        if (args.amount <= 0) {
            throw new Error('Amount must be greater than 0');
        }

        // Parse mint address
        let mintPublicKey;
        try {
            mintPublicKey = publicKey(args.mint);
        } catch (error) {
            throw new Error(`Invalid mint address: ${args.mint}`);
        }

        // Determine recipient - default to current keypair
        const recipientAddress = flags.recipient || getEffectiveOwner(umi).toString();
        let recipientPublicKey;
        try {
            recipientPublicKey = publicKey(recipientAddress);
        } catch (error) {
            throw new Error(`Invalid recipient address: ${recipientAddress}`);
        }

        // Find or create the associated token account for the recipient
        const tokenAccount = findAssociatedTokenPda(umi, { 
            mint: mintPublicKey, 
            owner: recipientPublicKey 
        });

        // Build the transaction to mint tokens
        const mintIx = createTokenIfMissing(umi, {
            mint: mintPublicKey,
            owner: recipientPublicKey,
        })
        .add(mintTokensTo(umi, {
            mint: mintPublicKey,
            token: tokenAccount,
            amount: args.amount,
        }));

        const mintSpinner = ora('Minting tokens...').start();
        try {
            const result = await umiSendAndConfirmTransaction(umi, mintIx);
            mintSpinner.succeed('Tokens minted successfully');

            if (!result.transaction.signature) {
                throw new Error('Transaction signature is missing');
            }

            const signature = txSignatureToString(result.transaction.signature as Uint8Array)

            this.logSuccess(await SUCCESS_MESSAGE(
                this.context.chain,
                args.mint,
                recipientAddress,
                args.amount,
                signature,
                { explorer }
            ));

            return {
                mint: args.mint,
                recipient: recipientAddress,
                amount: args.amount,
                signature,
                explorer: generateExplorerUrl(explorer, this.context.chain, signature, 'transaction'),
            };
        } catch (error: unknown) {
            mintSpinner.fail('Token minting failed');
            if (error instanceof Error) {
                throw new Error(`Token minting failed: ${error.message}`);
            }
            throw new Error('An unknown error occurred during token minting');
        }
    }
}