import {Args, Flags} from '@oclif/core'

import fs from 'node:fs'
import {BaseCommand} from '../../../BaseCommand.js'
import pluginConfigurator, {mapPluginDataToArray} from '../../../lib/core/pluginInquirer.js'
import {PluginFilterType, pluginSelector} from '../../../lib/core/pluginSelector.js'

/* 
  Plugins - Generate File Possibilities:

  1. Uses plugin inquirer to select plugins and generates a json file with the plugin data
     to supply various commands such as `create`.

     Will enable users to script effectively with the plugin data and not have to manually
     enter the data each time.

*/

export default class AssetFetch extends BaseCommand<typeof AssetFetch> {
  static description = 'Generate a plugin.json file with usable plugin data'

  static examples = ['<%= config.bin %> <%= command.id %>']

  // static args = {
  //   type: Args.string({description: 'Asset pubkey (mint) to fetch', required: true}),
  // }

  static flags = {
    asset: Flags.boolean({description: 'Generate Asset Plugin data', exclusive: ['collection']}),
    collection: Flags.boolean({description: 'Generate Collection Plugin data', exclusive: ['asset']}),
    output: Flags.string({
      name: 'output',
      char: 'o',
      description: 'Output directory of the plugins.json file. If not present current folder will be used.',
    }),
  }

  public async run(): Promise<unknown> {
    const {flags} = await this.parse(AssetFetch)

    if (!flags.asset && !flags.collection) {
      this.error('Please provide a --asset or --collection flag to generate plugin data')
    }

    const selectedPlugins = await pluginSelector(PluginFilterType.Asset)

    const pluginData = await pluginConfigurator(selectedPlugins)

    let destination = flags.output || process.cwd()

    fs.writeFileSync(destination + '/plugins.json', JSON.stringify(mapPluginDataToArray(pluginData), null, 2))

    return
  }
}
