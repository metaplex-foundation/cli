import {
  revokeV2,
  safeFetchGenesisAccountV2,
} from '@metaplex-foundation/genesis'
import { publicKey } from '@metaplex-foundation/umi'
import { Args, Flags } from '@oclif/core'
import ora from 'ora'

import { TransactionCommand } from '../../TransactionCommand.js'
import { generateExplorerUrl } from '../../explorers.js'
import { txSignatureToString } from '../../lib/util.js'
import umiSendAndConfirmTransaction from '../../lib/umi/sendAndConfirm.js'

export default class GenesisRevoke extends TransactionCommand<typeof GenesisRevoke> {
  static override description = `Revoke mint and/or freeze authority from a Genesis account.

This command revokes the mint authority and/or freeze authority from the Genesis account.
This is typically done after a token launch is complete to ensure no more tokens can be minted.

WARNING: This action is irreversible. Once revoked, the authority cannot be restored.

Options:
- --revokeMint: Revoke the mint authority (no more tokens can be minted)
- --revokeFreeze: Revoke the freeze authority (tokens cannot be frozen)`

  static override examples = [
    '$ mplx genesis revoke GenesisAddress123... --revokeMint --revokeFreeze',
    '$ mplx genesis revoke GenesisAddress123... --revokeMint',
    '$ mplx genesis revoke GenesisAddress123... --revokeFreeze',
  ]

  static override usage = 'genesis revoke [GENESIS] [FLAGS]'

  static override args = {
    genesis: Args.string({
      description: 'The Genesis account address',
      required: true,
    }),
  }

  static override flags = {
    revokeMint: Flags.boolean({
      description: 'Revoke the mint authority (no more tokens can be minted)',
      default: false,
    }),
    revokeFreeze: Flags.boolean({
      description: 'Revoke the freeze authority (tokens cannot be frozen)',
      default: false,
    }),
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(GenesisRevoke)

    if (!flags.revokeMint && !flags.revokeFreeze) {
      this.error('At least one of --revokeMint or --revokeFreeze must be specified')
    }

    const spinner = ora('Revoking authorities...').start()

    try {
      const genesisAddress = publicKey(args.genesis)

      // Fetch the Genesis account
      spinner.text = 'Fetching Genesis account details...'
      const genesisAccount = await safeFetchGenesisAccountV2(this.context.umi, genesisAddress)

      if (!genesisAccount) {
        spinner.fail('Genesis account not found')
        this.error(`Genesis account not found at address: ${args.genesis}`)
      }

      // Build the revoke transaction
      spinner.text = 'Revoking authorities...'
      const transaction = revokeV2(this.context.umi, {
        genesisAccount: genesisAddress,
        baseMint: genesisAccount.baseMint,
        authority: this.context.signer,
        baseTokenProgram: publicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
        revokeMintAuthority: flags.revokeMint,
        revokeFreezeAuthority: flags.revokeFreeze,
        padding: [0, 0, 0, 0, 0],
      })

      const result = await umiSendAndConfirmTransaction(this.context.umi, transaction)

      spinner.succeed('Authorities revoked successfully!')

      this.log('')
      this.logSuccess('Authorities revoked')
      this.log('')
      this.log('Revoke Details:')
      this.log(`  Genesis Account: ${genesisAddress}`)
      this.log(`  Base Mint: ${genesisAccount.baseMint}`)
      this.log(`  Mint Authority Revoked: ${flags.revokeMint ? 'Yes' : 'No'}`)
      this.log(`  Freeze Authority Revoked: ${flags.revokeFreeze ? 'Yes' : 'No'}`)
      this.log('')
      this.log(`Transaction: ${txSignatureToString(result.transaction.signature as Uint8Array)}`)
      this.log('')
      this.log(
        generateExplorerUrl(
          this.context.explorer,
          this.context.chain,
          txSignatureToString(result.transaction.signature as Uint8Array),
          'transaction'
        )
      )
      this.log('')
      this.log('WARNING: This action is irreversible. The revoked authorities cannot be restored.')

    } catch (error) {
      spinner.fail('Failed to revoke authorities')
      throw error
    }
  }
}
