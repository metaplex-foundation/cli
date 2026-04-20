import { Args, Flags } from '@oclif/core'
import ora from 'ora'

import { publicKey } from '@metaplex-foundation/umi'
import { generateExplorerUrl } from '../../../explorers.js'
import { TransactionCommand } from '../../../TransactionCommand.js'
import { txSignatureToString } from '../../../lib/util.js'
import { findExecutiveProfileV1Pda, findExecutionDelegateRecordV1Pda, revokeExecutionV1 } from '@metaplex-foundation/mpl-agent-registry/dist/src/generated/tools/index.js'

export default class AgentsExecutiveRevoke extends TransactionCommand<typeof AgentsExecutiveRevoke> {
  static override description = `Revoke an execution delegation for a registered agent.

  Removes an existing execution delegation, closing the delegation record
  and refunding its rent to --destination (defaults to the current signer).

  Either the asset owner or the executive authority can revoke a delegation.
  When --executive is omitted, defaults to the current signer (for executives revoking their own delegation).
  `

  static override examples = [
    '$ mplx agents executive revoke <agentMint>',
    '$ mplx agents executive revoke <agentMint> --executive <executive-wallet>',
  ]

  static override usage = 'agents executive revoke <agentMint> [--executive <executive-wallet>]'

  static override args = {
    agentMint: Args.string({ description: 'The agent\'s Core asset address', required: true }),
  }

  static override flags = {
    executive: Flags.string({
      description: 'The executive\'s wallet address (defaults to the current signer)',
    }),
    destination: Flags.string({
      description: 'Wallet to receive refunded rent (defaults to the current signer)',
    }),
  }

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(AgentsExecutiveRevoke)
    const { umi, explorer, chain, signer } = this.context

    const assetPk = publicKey(args.agentMint)
    const executivePk = flags.executive ? publicKey(flags.executive) : signer.publicKey

    // Derive PDAs
    const [executiveProfile] = findExecutiveProfileV1Pda(umi, { authority: executivePk })
    const [executionDelegateRecord] = findExecutionDelegateRecordV1Pda(umi, {
      executiveProfile,
      agentAsset: assetPk,
    })

    const spinner = ora('Revoking execution delegation...').start()

    let tx
    try {
      tx = await revokeExecutionV1(umi, {
        executionDelegateRecord,
        agentAsset: assetPk,
        destination: flags.destination ? publicKey(flags.destination) : signer.publicKey,
      }).sendAndConfirm(umi)
    } catch (err) {
      spinner.fail('Failed to revoke execution delegation')
      throw err
    }

    const signature = txSignatureToString(tx.signature)

    spinner.succeed('Execution delegation revoked successfully')

    const explorerUrl = generateExplorerUrl(explorer, chain, signature, 'transaction')

    this.log(`--------------------------------
  Agent Mint: ${args.agentMint}
  Executive Wallet: ${executivePk.toString()}
  Signature: ${signature}
  Explorer: ${explorerUrl}
--------------------------------`)

    return {
      agentMint: args.agentMint,
      executiveWallet: executivePk.toString(),
      signature,
      explorer: explorerUrl,
    }
  }
}
