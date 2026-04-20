import { Args } from '@oclif/core'

import { TransactionCommand } from '../../../TransactionCommand.js'

export default class CollectionAdd extends TransactionCommand<typeof CollectionAdd> {
  static override description = 'Add an existing MPL Core Asset to a Collection (alias for `core asset update --collection`)'

  static override examples = [
    '<%= config.bin %> <%= command.id %> <collection> <asset>',
  ]

  static override args = {
    collection: Args.string({ description: 'Collection to add the asset to', required: true }),
    asset: Args.string({ description: 'Asset to add to the collection', required: true }),
  }

  public async run(): Promise<unknown> {
    const { args } = await this.parse(CollectionAdd)
    const { rpc, keypair, payer, commitment, config: configPath, 'log-level': logLevel } = this.flags as Record<string, string | undefined>

    this.log('Note: This command is an alias for `mplx core asset update <asset> --collection <collection>`')

    const argv = [args.asset, '--collection', args.collection]
    if (rpc) argv.push('--rpc', rpc)
    if (keypair) argv.push('--keypair', keypair)
    if (payer) argv.push('--payer', payer)
    if (commitment) argv.push('--commitment', commitment)
    if (configPath) argv.push('--config', configPath)
    if (logLevel) argv.push('--log-level', logLevel)

    return this.config.runCommand('core:asset:update', argv)
  }
}
