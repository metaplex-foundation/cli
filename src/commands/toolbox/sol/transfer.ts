import { Args } from '@oclif/core'
import { transferSol } from '@metaplex-foundation/mpl-toolbox'
import { publicKey, sol } from '@metaplex-foundation/umi'
import { base58 } from '@metaplex-foundation/umi/serializers'
import ora from 'ora'
import { TransactionCommand } from '../../../TransactionCommand.js'
import umiSendAndConfirmTransaction from '../../../lib/umi/sendAndConfirm.js'

const SUCCESS_MESSAGE = (amount: number, address: string, signature: string) => `--------------------------------
Transferred ${amount} SOL to ${address}
Signature: ${signature}
--------------------------------`;

export default class ToolboxSolTransfer extends TransactionCommand<typeof ToolboxSolTransfer> {
    static override description = 'Transfer SOL to a Solana address'

    static override examples = [
        '<%= config.bin %> <%= command.id %> 1 11111111111111111111111111111111'
    ]

    static override usage = 'toolbox sol transfer [AMOUNT] [ADDRESS]'

    static override args = {
        amount: Args.integer({ 
            description: 'Amount of SOL to transfer', 
            required: true 
        }),
        address: Args.string({ 
            description: 'Solana address to transfer SOL to', 
            required: true 
        }),
    }

    private validateInput(amount: number, address: string) {
        if (amount <= 0) {
            throw new Error('Amount must be greater than 0');
        }

        try {
            publicKey(address);
        } catch (error) {
            throw new Error('Invalid Solana address');
        }
    }

    public async run(): Promise<string> {
        const { args } = await this.parse(ToolboxSolTransfer)
        const { umi } = this.context

        this.validateInput(args.amount, args.address);

        const spinner = ora('Transferring SOL...').start();

        try {
            const tx = transferSol(umi, {
                destination: publicKey(args.address),
                amount: sol(args.amount)
            });

            const result = await umiSendAndConfirmTransaction(umi, tx);
            spinner.succeed('SOL transferred successfully');

            this.logSuccess(SUCCESS_MESSAGE(
                args.amount,
                args.address,
                base58.deserialize(result.transaction.signature as Uint8Array)[0]
            ));

            return 'success';
        } catch (error) {
            spinner.fail('Failed to transfer SOL');
            if (error instanceof Error) {
                throw new Error(`Transfer failed: ${error.message}`);
            }
            throw new Error('An unknown error occurred during transfer');
        }
    }
}
