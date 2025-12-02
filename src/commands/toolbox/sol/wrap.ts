import { 
  createAssociatedToken,
  findAssociatedTokenPda,
  syncNative,
  transferSol
} from '@metaplex-foundation/mpl-toolbox'
import { publicKey, TransactionBuilder, sol } from '@metaplex-foundation/umi'
import { Args } from '@oclif/core'
import ora from 'ora'

import { TransactionCommand } from '../../../TransactionCommand.js'
import umiSendAndConfirmTransaction from '../../../lib/umi/sendAndConfirm.js'
import { txSignatureToString } from '../../../lib/util.js'

const NATIVE_MINT = publicKey('So11111111111111111111111111111111111111112')

export default class ToolboxSolWrap extends TransactionCommand<typeof ToolboxSolWrap> {
    static override description = 'Wrap SOL to create wSOL (wrapped SOL) tokens'

    static override args = {
        amount: Args.string({ 
            description: 'Amount of SOL to wrap (e.g., 1 or 0.5)', 
            required: true 
        }),
    }

    static override examples = [
        '<%= config.bin %> <%= command.id %> 1',
        '<%= config.bin %> <%= command.id %> 0.5',
    ]

    static override usage = 'toolbox sol wrap [AMOUNT]'

    public async run(): Promise<string> {
        const { args } = await this.parse(ToolboxSolWrap)
        const { umi } = this.context

        const amount = Number.parseFloat(args.amount)
        if (Number.isNaN(amount) || amount <= 0) {
            throw new Error('Amount must be a positive number')
        }

        const spinner = ora('Wrapping SOL...').start()

        try {
            const [associatedTokenPda] = findAssociatedTokenPda(umi, {
                mint: NATIVE_MINT,
                owner: umi.identity.publicKey,
            })

            const tokenAccount = await umi.rpc.getAccount(associatedTokenPda).catch(() => null)
            
            let transaction = new TransactionBuilder()

            if (!tokenAccount || !tokenAccount.exists) {
                const createTokenInstruction = createAssociatedToken(umi, {
                    mint: NATIVE_MINT,
                    owner: umi.identity.publicKey,
                })
                transaction = transaction.add(createTokenInstruction)
            }

            const transferInstruction = transferSol(umi, {
                amount: sol(amount),
                destination: associatedTokenPda,
            })
            transaction = transaction.add(transferInstruction)

            const syncInstruction = syncNative(umi, {
                account: associatedTokenPda,
            })
            transaction = transaction.add(syncInstruction)

            const result = await umiSendAndConfirmTransaction(umi, transaction).catch((error) => {
                spinner.fail('Failed to wrap SOL')
                console.error(error)
                throw error
            })

            spinner.succeed('SOL wrapped successfully')

            this.logSuccess(
                `--------------------------------
    Wrapped ${amount} SOL to wSOL
    Token Account: ${associatedTokenPda}
    Signature: ${txSignatureToString(result.transaction.signature as Uint8Array)}
--------------------------------`
            )

            return 'success'

        } catch (error) {
            spinner.fail('Failed to wrap SOL')
            throw error
        }
    }
}