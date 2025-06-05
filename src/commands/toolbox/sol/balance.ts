import { amountToNumber, isPublicKey, publicKey } from '@metaplex-foundation/umi';
import { Args } from '@oclif/core';
import { TransactionCommand } from '../../../TransactionCommand.js';
import { shortenAddress } from '../../../lib/util.js';

const SUCCESS_MESSAGE = (address: string, balance: number) => `--------------------------------
SOL Balance Check
Address: ${shortenAddress(address)}
Balance: ${balance} SOL
--------------------------------`;

export default class ToolboxSolBalance extends TransactionCommand<typeof ToolboxSolBalance> {
    static override description = 'Check the SOL balance of a Solana address. If no address is provided, checks the balance of the current identity.'

    static override examples = [
        '<%= config.bin %> <%= command.id %>',  // Check current identity's balance
        '<%= config.bin %> <%= command.id %> <address>',  // Check specific address balance
    ]

    static override usage = 'toolbox sol balance [ADDRESS]'

    static override args = {
        address: Args.string({
            description: 'Optional Solana address to check balance for. If not provided, checks the current identity\'s balance.',
            required: false
        }),
    }

    private async validateInput(address?: string) {
        if (address && !isPublicKey(address)) {
            throw new Error('Invalid Solana address provided. Please provide a valid public key.');
        }

        return {
            address: address
        };
    }

    public async run() {
        const { args } = await this.parse(ToolboxSolBalance)
        const { umi } = this.context

        const validatedInput = await this.validateInput(args.address)
        const targetAddress = validatedInput.address ? publicKey(validatedInput.address) : umi.identity.publicKey

        try {
            const balance = await umi.rpc.getBalance(targetAddress)
            const balanceNumber = amountToNumber(balance)

            this.logSuccess(SUCCESS_MESSAGE(
                targetAddress.toString(),
                balanceNumber
            ))
        } catch (err) {
            if (err instanceof Error) {
                throw new Error(`Failed to check balance: ${err.message}`)
            }
            throw new Error('An unknown error occurred while checking balance')
        }
    }
}