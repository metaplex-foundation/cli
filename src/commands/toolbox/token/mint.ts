import { Flags } from '@oclif/core'
import { createTokenIfMissing, findAssociatedTokenPda, mintTokensTo } from '@metaplex-foundation/mpl-toolbox'
import { publicKey } from '@metaplex-foundation/umi'
import { base58 } from '@metaplex-foundation/umi/serializers'
import ora from 'ora'
import { TransactionCommand } from '../../../TransactionCommand.js'
import { ExplorerType, generateExplorerUrl } from '../../../explorers.js'
import umiSendAndConfirmTransaction from '../../../lib/umi/sendAndConfirm.js'
import { RpcChain, txSignatureToString } from '../../../lib/util.js'

const SUCCESS_MESSAGE = async (
    chain: RpcChain,
    mint: string,
    recipient: string,
    amount: number,
    signature: Uint8Array,
    options: { explorer: ExplorerType; executionTime?: number }
) => {
    const timingInfo = options.executionTime
        ? `\nExecution Time: ${(options.executionTime / 1000).toFixed(4)} seconds`
        : '';

    return `--------------------------------
Tokens minted successfully!

Mint Details:
Mint Address: ${mint}
Recipient: ${recipient}
Amount Minted: ${amount}

Transaction Signature: ${txSignatureToString(signature)}
Explorer: ${generateExplorerUrl(options.explorer, chain, txSignatureToString(signature), 'transaction')}${timingInfo}
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
        '<%= config.bin %> <%= command.id %> --mint 7EYnhQoR9YM3c7UoaKRoA4q6YQ2Jx4VvQqKjB5x8XqWs --amount 1000',
        '<%= config.bin %> <%= command.id %> --mint 7EYnhQoR9YM3c7UoaKRoA4q6YQ2Jx4VvQqKjB5x8XqWs --amount 1000 --recipient 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
    ]

    static override usage = 'toolbox token mint --mint <MINT_ADDRESS> --amount <AMOUNT> [--recipient <RECIPIENT_ADDRESS>]'

    static override flags = {
        mint: Flags.string({
            description: 'The mint address of the token to mint additional tokens for',
            required: true,
        }),
        amount: Flags.integer({
            description: 'The number of tokens to mint (must be greater than 0)',
            required: true,
        }),
        recipient: Flags.string({
            description: 'The wallet address to receive the minted tokens (defaults to current keypair)',
            required: false,
        }),
        'speed-run': Flags.boolean({
            description: 'Enable speed run mode to measure execution time',
            required: false,
        }),
    }

    public async run() {
        const startTime = Date.now();
        const { flags } = await this.parse(ToolboxTokenMint)
        const { umi, explorer } = this.context

        try {
            // Validate amount
            if (flags.amount <= 0) {
                throw new Error('Amount must be greater than 0');
            }

            // Parse mint address
            let mintPublicKey;
            try {
                mintPublicKey = publicKey(flags.mint);
            } catch (error) {
                throw new Error(`Invalid mint address: ${flags.mint}`);
            }

            // Determine recipient - default to current keypair
            const recipientAddress = flags.recipient || umi.payer.publicKey.toString();
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
                amount: flags.amount,
            }));

            const mintSpinner = ora('Minting tokens...').start();
            try {
                const result = await umiSendAndConfirmTransaction(umi, mintIx);
                mintSpinner.succeed('Tokens minted successfully');

                if (!result.transaction.signature) {
                    throw new Error('Transaction signature is missing');
                }

                const executionTime = Date.now() - startTime;

                this.logSuccess(await SUCCESS_MESSAGE(
                    this.context.chain,
                    flags.mint,
                    recipientAddress,
                    flags.amount,
                    result.transaction.signature as Uint8Array,
                    { explorer, executionTime: flags['speed-run'] ? executionTime : undefined }
                ));

                return result;
            } catch (error: unknown) {
                mintSpinner.fail('Token minting failed');
                if (error instanceof Error) {
                    throw new Error(`Token minting failed: ${error.message}`);
                }
                throw new Error('An unknown error occurred during token minting');
            }
        } catch (error) {
            if (flags['speed-run']) {
                const executionTime = Date.now() - startTime;
                this.error(`Command failed after ${(executionTime / 1000).toFixed(4)} seconds: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
            throw error;
        }
    }
}