import ora from 'ora'

import { generateExplorerUrl } from '../../../explorers.js'
import { TransactionCommand } from '../../../TransactionCommand.js'
import { txSignatureToString } from '../../../lib/util.js'
import { findExecutiveProfileV1Pda, registerExecutiveV1 } from '@metaplex-foundation/mpl-agent-registry/dist/src/generated/tools/index.js'

export default class AgentsExecutiveRegister extends TransactionCommand<typeof AgentsExecutiveRegister> {
  static override description = `Register an executive profile for agent execution.

  Creates a one-time on-chain executive profile PDA for the current wallet.
  Each wallet can only have one executive profile. This profile is required
  before delegating execution to any agent.
  `

  static override examples = [
    '$ mplx agents executive register',
  ]

  static override usage = 'agents executive register'

  public async run(): Promise<unknown> {
    const { umi, explorer, chain, signer } = this.context

    const spinner = ora('Registering executive profile...').start()

    const tx = await registerExecutiveV1(umi, {}).sendAndConfirm(umi)

    const signature = txSignatureToString(tx.signature)

    // Derive the executive profile PDA for display
    const [profilePda] = findExecutiveProfileV1Pda(umi, { authority: signer.publicKey })

    spinner.succeed('Executive profile registered successfully')

    const explorerUrl = generateExplorerUrl(explorer, chain, signature, 'transaction')

    this.log(`--------------------------------
  Executive Profile: ${profilePda.toString()}
  Authority: ${signer.publicKey.toString()}
  Signature: ${signature}
  Explorer: ${explorerUrl}
--------------------------------`)

    return {
      executiveProfile: profilePda.toString(),
      authority: signer.publicKey.toString(),
      signature,
      explorer: explorerUrl,
    }
  }
}
