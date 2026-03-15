import {
  createAssociatedToken,
  findAssociatedTokenPda,
  syncNative,
  transferSol
} from '@metaplex-foundation/mpl-toolbox'
import { publicKey, TransactionBuilder, sol } from '@metaplex-foundation/umi'
import { Args } from '@oclif/core'
import ora from 'ora'

import { generateExplorerUrl } from '../../../explorers.js'
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

    public async run(): Promise<unknown> {
        const { args } = await this.parse(ToolboxSolWrap)
        const { umi, explorer, chain } = this.context

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

            const accountInfo = await umi.rpc.getAccount(associatedTokenPda).catch(() => null)

            let transaction = new TransactionBuilder()

            if (!accountInfo || !accountInfo.exists) {
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
                throw error
            })

            spinner.succeed('SOL wrapped successfully')

            const signature = txSignatureToString(result.transaction.signature as Uint8Array)
            const tokenAccount = associatedTokenPda.toString()
            const explorerUrl = generateExplorerUrl(explorer, chain, signature, 'transaction')

            this.logSuccess(
                `--------------------------------
    Wrapped ${amount} SOL to wSOL
    Token Account: ${tokenAccount}
    Signature: ${signature}
    Explorer: ${explorerUrl}
--------------------------------`
            )

            return {
                amount,
                tokenAccount,
                signature,
                explorer: explorerUrl,
            }

        } catch (error) {
            spinner.fail('Failed to wrap SOL')
            throw error
        }
    }
}