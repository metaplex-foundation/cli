import { Args, Flags } from '@oclif/core'
import ora from 'ora'

import { publicKey } from '@metaplex-foundation/umi'
import { generateExplorerUrl } from '../../../explorers.js'
import { TransactionCommand } from '../../../TransactionCommand.js'
import { txSignatureToString } from '../../../lib/util.js'
import { findAgentIdentityV1Pda } from '@metaplex-foundation/mpl-agent-registry/dist/src/generated/identity/index.js'
import { delegateExecutionV1, findExecutiveProfileV1Pda } from '@metaplex-foundation/mpl-agent-registry/dist/src/generated/tools/index.js'

export default class AgentsExecutiveDelegate extends TransactionCommand<typeof AgentsExecutiveDelegate> {
  static override description = `Delegate execution of a registered agent to an executive profile.

  Links a registered agent asset to a specified executive profile,
  allowing that executive to sign transactions on behalf of the agent.

  Only the asset owner can delegate execution. Each delegation is per-asset.
  The executive must have already registered their profile (see: mplx agents executive register).
  `

  static override examples = [
    '$ mplx agents executive delegate <agent-asset> --executive <executive-wallet>',
  ]

  static override usage = 'agents executive delegate <agent-asset> --executive <executive-wallet>'

  static override args = {
    asset: Args.string({ description: 'The registered agent asset address to delegate', required: true }),
  }

  static override flags = {
    executive: Flags.string({
      description: 'The executive\'s wallet address (their executive profile PDA will be derived automatically)',
      required: true,
    }),
  }

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(AgentsExecutiveDelegate)
    const { umi, explorer, chain } = this.context

    const assetPk = publicKey(args.asset)

    // Derive PDAs
    const [agentIdentity] = findAgentIdentityV1Pda(umi, { asset: assetPk })
    const [executiveProfile] = findExecutiveProfileV1Pda(umi, { authority: publicKey(flags.executive) })

    const spinner = ora('Delegating execution...').start()

    const tx = await delegateExecutionV1(umi, {
      executiveProfile,
      agentAsset: assetPk,
      agentIdentity,
    }).sendAndConfirm(umi)

    const signature = txSignatureToString(tx.signature)

    spinner.succeed('Execution delegated successfully')

    const explorerUrl = generateExplorerUrl(explorer, chain, signature, 'transaction')

    this.log(`--------------------------------
  Agent Asset: ${args.asset}
  Executive Profile: ${executiveProfile.toString()}
  Signature: ${signature}
  Explorer: ${explorerUrl}
--------------------------------`)

    return {
      agentAsset: args.asset,
      executiveWallet: flags.executive,
      executiveProfile: executiveProfile.toString(),
      signature,
      explorer: explorerUrl,
    }
  }
}
