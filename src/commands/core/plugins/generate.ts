import { Args, Flags } from '@oclif/core'

import fs from 'node:fs'
import { BaseCommand } from '../../../BaseCommand.js'
import { PluginFilterType, pluginSelector } from '../../../prompts/pluginSelector.js'
import pluginConfigurator, { mapPluginDataToArray } from '../../../prompts/pluginInquirer.js'
import { Plugin } from '../../../lib/types/pluginData.js'

/* 
  Plugins - Generate File Possibilities:

  1. Uses plugin inquirer to select plugins and generates a json file with the plugin data
     to supply various commands such as `create`.

     Will enable users to script effectively with the plugin data and not have to manually
     enter the data each time.

*/

export default class CorePluginsGenerate extends BaseCommand<typeof CorePluginsGenerate> {
  static description = 'Generate a plugin.json file with usable plugin data'

  static examples = ['<%= config.bin %> <%= command.id %>']

  // static args = {
  //   type: Args.string({description: 'Asset pubkey (mint) to fetch', required: true}),
  // }

  static flags = {
    asset: Flags.boolean({ description: 'Generate Asset Plugin data', exclusive: ['collection'] }),
    collection: Flags.boolean({ description: 'Generate Collection Plugin data', exclusive: ['asset'] }),
    output: Flags.string({
      name: 'output',
      char: 'o',
      description: 'Output directory for the plugins.json file. If not present current folder will be used.',
    }),
  }

  public async run(): Promise<unknown> {
    const { flags } = await this.parse(CorePluginsGenerate)

    if (!flags.asset && !flags.collection) {
      this.error('Please provide a --asset or --collection flag to generate plugin data')
    }

    const selectedPlugins = await pluginSelector({ filter: flags.asset ? PluginFilterType.Asset : PluginFilterType.Collection })

    const pluginData = await pluginConfigurator(selectedPlugins as Plugin[])

    let destination = flags.output || process.cwd()

    fs.writeFileSync(destination + '/plugins.json', JSON.stringify(mapPluginDataToArray(pluginData), null, 2))

    return
  }
}
