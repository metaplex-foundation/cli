import inquirer from 'inquirer'
import {Plugin} from './pluginInquirer.js'

export enum PluginFilterType {
  Common,
  Asset,
  Collection,
}

const pluginList = [
  {
    name: 'Attributes Plugin',
    value: 'attributes',
    type: PluginFilterType.Common,
  },
  {
    name: 'Royalty Plugin',
    value: 'royalties',
    type: PluginFilterType.Common,
  },
  {
    name: 'Update Delegate Plugin',
    value: 'update',
    type: PluginFilterType.Common,
  },
  {
    name: 'Permanent Freeze Plugin',
    value: 'pFreeze',
    type: PluginFilterType.Common,
  },
  {
    name: 'Permanent Transfer Plugin',
    value: 'pTransfer',
    type: PluginFilterType.Common,
  },
  {
    name: 'Permanent Burn Plugin',
    value: 'pBurn',
    type: PluginFilterType.Common,
  },
  {
    name: 'Add Blocker Plugin',
    value: 'addBlocker',
    type: PluginFilterType.Common,
  },
  {
    name: 'Immutable Metadata Plugin',
    value: PluginFilterType.Common,
  },
  {
    name: 'Autograph Plugin',
    value: 'autograph',
    type: PluginFilterType.Common,
  },
  {
    name: 'Immutable Metadata Plugin',
    value: 'immutableMetadata',
    type: PluginFilterType.Common,
  },
  {
    name: 'Verified Creators Plugin',
    value: 'verifiedCreators',
    type: PluginFilterType.Common,
  },

  {
    name: 'Master Edition Plugin',
    value: 'masterEdition',
    type: PluginFilterType.Collection,
  },
  {
    name: 'Edition Plugin',
    value: 'edition',
    type: PluginFilterType.Asset,
  },
  {
    name: 'Freeze Delegate Plugin',
    value: 'freezeDelegate',
    type: PluginFilterType.Asset,
  },
  {
    name: 'Burn Delegate Plugin',
    value: 'burnDelegate',
    type: PluginFilterType.Asset,
  },
  {
    name: 'Transfer Delegate Plugin',
    value: 'transferDelegate',
    type: PluginFilterType.Asset,
  },
]

// Selecting PluginFilterType.Asset will return all plugins that
// are related to assets including the common plugins.

// Selecting PluginFilterType.Collection will return all plugins
// that are related to collections including the common plugins.

const pluginSelector = async (
  filter: PluginFilterType.Asset | PluginFilterType.Collection,
  message?: string,
): Promise<Array<Plugin>> => {
  const selectedPlugins = await inquirer
    .prompt([
      /* Pass your questions in here */
      {
        type: 'checkbox',
        name: 'Plugins',
        choices: pluginList
          .filter((plugin) => plugin.type === filter || plugin.type === PluginFilterType.Common)
          .map((plugin) => {
            return {
              name: plugin.name,
              value: plugin.value,
            }
          }), // Add the plugin name and value here
        message: message
          ? message
          : `Would you like to add any plugins to the ${filter === PluginFilterType.Asset ? 'Asset' : 'Collection'}?`,
        pageSize: 20,
      },
    ])
    .then((answers) => {
      return answers.Plugins
    })
    .catch((error) => {
      if (error.isTtyError) {
        // Prompt couldn't be rendered in the current environment
        console.log("Prompt couldn't be rendered in the current environment")
      } else {
        // Something else went wrong
        console.log(error)
      }
    })

  console.log(selectedPlugins)
  return selectedPlugins
}

export {pluginSelector}
