import {Args} from '@oclif/core'

import {amountToNumber} from '@metaplex-foundation/umi'
import {BaseCommand} from '../../BaseCommand.js'

export default class ToolboxRent extends BaseCommand<typeof ToolboxRent> {
  static override description = 'Get rent cost for a given number of bytes'

  static override examples = ['<%= config.bin %> <%= command.id %> <bytes>']

  static override args = {
    bytes: Args.integer({description: 'Number of bytes', required: true}),
  }

  public async run() {
    const {args} = await this.parse(ToolboxRent)

    const {umi} = this.context

    const rent = await umi.rpc.getRent(args.bytes)

    this.logSuccess(
      `--------------------------------
    Rent cost for ${args.bytes} bytes is ${amountToNumber(rent)} SOL
--------------------------------`,
    )
  }
}
