import { Args } from '@oclif/core'
import ora from 'ora'

import { publicKey } from '@metaplex-foundation/umi'
import { generateExplorerUrl } from '../../explorers.js'
import { TransactionCommand } from '../../TransactionCommand.js'
import { txSignatureToString } from '../../lib/util.js'
import { setAgentTokenV1 } from '@metaplex-foundation/mpl-agent-registry/dist/src/generated/identity/index.js'

export default class AgentsSetAgentToken extends TransactionCommand<typeof AgentsSetAgentToken> {
  static override description = `Link a Genesis token to a registered agent identity.

  Associates a Genesis token launch with the agent's on-chain identity by
  reading the base_mint from the Genesis account and storing it on the
  AgentIdentityV2 PDA.

  The authority must be the asset's Asset Signer PDA, so this command must
  be run in asset-signer mode. Configure with:
    mplx config wallets add --name my-agent --type asset-signer --asset <ASSET>
    mplx config wallets set my-agent

  The agent token can only be set once per identity.
  `

  static override examples = [
    '$ mplx agents set-agent-token <agent-asset> <genesis-account>',
  ]

  static override usage = 'agents set-agent-token <agent-asset> <genesis-account>'

  static override args = {
    asset: Args.string({ description: 'The registered agent asset address', required: true }),
    genesis: Args.string({ description: 'The Genesis account address for the token launch', required: true }),
  }

  public async run(): Promise<unknown> {
    const { args } = await this.parse(AgentsSetAgentToken)
    const { umi, explorer, chain } = this.context

    const assetPk = publicKey(args.asset)
    const genesisPk = publicKey(args.genesis)

    const spinner = ora('Setting agent token...').start()

    let tx
    try {
      tx = await setAgentTokenV1(umi, {
        asset: assetPk,
        genesisAccount: genesisPk,
      }).sendAndConfirm(umi)
    } catch (err) {
      spinner.fail('Failed to set agent token')
      throw err
    }

    const signature = txSignatureToString(tx.signature)

    spinner.succeed('Agent token set successfully')

    const explorerUrl = generateExplorerUrl(explorer, chain, signature, 'transaction')

    this.log(`--------------------------------
  Agent Asset: ${args.asset}
  Genesis Account: ${args.genesis}
  Signature: ${signature}
  Explorer: ${explorerUrl}
--------------------------------`)

    return {
      agentAsset: args.asset,
      genesisAccount: args.genesis,
      signature,
      explorer: explorerUrl,
    }
  }
}
