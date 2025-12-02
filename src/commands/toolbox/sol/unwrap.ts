import { 
  closeToken,
  findAssociatedTokenPda,
  fetchToken
} from '@metaplex-foundation/mpl-toolbox'
import { publicKey } from '@metaplex-foundation/umi'
import ora from 'ora'

import { TransactionCommand } from '../../../TransactionCommand.js'
import umiSendAndConfirmTransaction from '../../../lib/umi/sendAndConfirm.js'
import { txSignatureToString } from '../../../lib/util.js'

const NATIVE_MINT = publicKey('So11111111111111111111111111111111111111112')

export default class ToolboxSolUnwrap extends TransactionCommand<typeof ToolboxSolUnwrap> {
    static override description = 'Unwrap all wSOL (wrapped SOL) tokens back to native SOL'

    static override examples = [
        '<%= config.bin %> <%= command.id %>',
    ]

    static override usage = 'toolbox sol unwrap'

    public async run(): Promise<string> {
        await this.parse(ToolboxSolUnwrap)
        const { umi } = this.context

        const spinner = ora('Unwrapping all wSOL...').start()

        try {
            const [associatedTokenPda] = findAssociatedTokenPda(umi, {
                mint: NATIVE_MINT,
                owner: umi.identity.publicKey,
            })

            const tokenAccount = await umi.rpc.getAccount(associatedTokenPda).catch(() => null)
            
            if (!tokenAccount || !tokenAccount.exists) {
                spinner.fail('No wrapped SOL token account found')
                throw new Error('No wrapped SOL token account found for this wallet')
            }

            const tokenData = await fetchToken(umi, associatedTokenPda)
            const amountInLamports = tokenData.amount
            const amountInSol = Number(amountInLamports) / 1_000_000_000

            const tx = closeToken(umi, {
                account: associatedTokenPda,
                destination: umi.identity.publicKey,
                owner: umi.identity,
            })

            const result = await umiSendAndConfirmTransaction(umi, tx).catch((error) => {
                spinner.fail('Failed to unwrap wSOL')
                console.error(error)
                throw error
            })

            spinner.succeed('wSOL unwrapped successfully')

            this.logSuccess(
                `--------------------------------
    Unwrapped ${amountInSol} SOL
    Token Account Closed: ${associatedTokenPda}
    Signature: ${txSignatureToString(result.transaction.signature as Uint8Array)}
--------------------------------`
            )

            return 'success'

        } catch (error) {
            spinner.fail('Failed to unwrap wSOL')
            throw error
        }
    }
}