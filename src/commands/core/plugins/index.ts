import { Command, Flags } from '@oclif/core'
import { BaseCommand } from '../../../BaseCommand.js'

export default class CorePlugins extends BaseCommand<typeof CorePlugins> {
  static override description = `MPL Core Plugin Management - Add and manage plugins for assets and collections

The plugin commands provide functionality for managing plugins that extend the capabilities of assets and collections on the Solana blockchain.

Available subcommands:
  add      - Add plugins to assets or collections (with wizard or JSON config)
  remove   - Remove plugins from assets or collections
  generate - Generate reusable plugin configuration files for scripting

Available Plugin Types:
  Common Plugins (Asset & Collection):
    - Attributes
    - Royalties
    - Update Delegate
    - Permanent Freeze
    - Permanent Transfer
    - Permanent Burn
    - Add Blocker
    - Immutable Metadata
    - Autograph
    - Verified Creators

  Collection-specific Plugins:
    - Master Edition

  Asset-specific Plugins:
    - Edition
    - Freeze Delegate
    - Burn Delegate
    - Transfer Delegate`

  static override examples = [
    '$ mplx core plugins add <assetId> --wizard',
    '$ mplx core plugins add <assetId> ./plugin.json',
    '$ mplx core plugins generate --asset',
    '$ mplx core plugins generate --collection',

  ]

  static override flags = {
    help: Flags.help({char: 'h'}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(CorePlugins)
    
    // Show help by default
    this.log(CorePlugins.description)
    this.log('\nExamples:')
    CorePlugins.examples.forEach(example => {
      this.log(`  ${example}`)
    })
  }
}
