import { Args } from '@oclif/core'
import util from 'node:util'

import { publicKey } from '@metaplex-foundation/umi'
import { fetchAssetV1, findAssetSignerPda } from '@metaplex-foundation/mpl-core'
import { BaseCommand } from '../../BaseCommand.js'
import { findAgentIdentityV1Pda, safeFetchAgentIdentityV1 } from '@metaplex-foundation/mpl-agent-registry/dist/src/generated/identity/index.js'

export default class AgentsFetch extends BaseCommand<typeof AgentsFetch> {
  static override description = `Fetch and display agent identity data for a registered Core asset.

  Reads the on-chain agent identity PDA and displays registration info,
  lifecycle hooks, and the agent's built-in wallet (Asset Signer PDA).
  `

  static override examples = [
    '<%= config.bin %> agents fetch <asset>',
  ]

  static override args = {
    asset: Args.string({ description: 'The MPL Core asset address to look up', required: true }),
  }

  public async run(): Promise<unknown> {
    const { args } = await this.parse(AgentsFetch)
    const { umi } = this.context

    const assetPk = publicKey(args.asset)

    // Fetch the Core asset
    const asset = await fetchAssetV1(umi, assetPk)

    // Derive and fetch the agent identity PDA
    const [identityPda] = findAgentIdentityV1Pda(umi, { asset: assetPk })
    const identity = await safeFetchAgentIdentityV1(umi, identityPda)

    if (!identity) {
      this.log('No agent identity found for this asset. The asset may not be registered.')
      return { registered: false, asset: args.asset }
    }

    // Derive the Asset Signer PDA (agent wallet)
    const [walletPda] = findAssetSignerPda(umi, { asset: assetPk })

    // Extract agent identity plugin data from the asset
    const agentPlugin = (asset as any).agentIdentities?.[0]

    const result: Record<string, unknown> = {
      registered: true,
      asset: args.asset,
      owner: asset.owner.toString(),
      identityPda: identityPda.toString(),
      wallet: walletPda.toString(),
      registrationUri: agentPlugin?.uri ?? null,
      lifecycleChecks: agentPlugin?.lifecycleChecks ?? null,
    }

    this.log(util.inspect(result, false, null, true))

    return result
  }
}
