import inquirer from 'inquirer'
import { Plugin } from '../lib/types/pluginData.js'

export enum PluginFilterType {
  Common,
  Asset,
  Collection,
  Owner,
  Authority,
}

const pluginList = [
  {
    name: 'Attributes Plugin',
    value: 'attributes',
    type: PluginFilterType.Common,
    managed: PluginFilterType.Authority
  },
  {
    name: 'Royalty Plugin',
    value: 'royalties',
    type: PluginFilterType.Common,
    managed: PluginFilterType.Authority
  },
  {
    name: 'Update Delegate Plugin',
    value: 'update',
    type: PluginFilterType.Common,
    managed: PluginFilterType.Authority
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
    managed: PluginFilterType.Authority
  },
  {
    name: 'Immutable Metadata Plugin',
    value: PluginFilterType.Common,
    managed: PluginFilterType.Authority
  },
  {
    name: 'Autograph Plugin',
    value: 'autograph',
    type: PluginFilterType.Common,
    managed: PluginFilterType.Owner
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
    managed: PluginFilterType.Owner
  },

  {
    name: 'Master Edition Plugin',
    value: 'masterEdition',
    type: PluginFilterType.Collection,
    managed: PluginFilterType.Authority
  },
  {
    name: 'Edition Plugin',
    value: 'edition',
    type: PluginFilterType.Asset,
    managed: PluginFilterType.Authority
  },
  {
    name: 'Freeze Delegate Plugin',
    value: 'freezeDelegate',
    type: PluginFilterType.Asset,
    managed: PluginFilterType.Owner
  },
  {
    name: 'Burn Delegate Plugin',
    value: 'burnDelegate',
    type: PluginFilterType.Asset,
    managed: PluginFilterType.Owner
  },
  {
    name: 'Transfer Delegate Plugin',
    value: 'transferDelegate',
    type: PluginFilterType.Asset,
    managed: PluginFilterType.Owner
  },
]



// Selecting PluginFilterType.Asset will return all plugins that
// are related to assets including the common plugins.

// Selecting PluginFilterType.Collection will return all plugins
// that are related to collections including the common plugins.

interface PluginSelectorOptions {
  filter: PluginFilterType.Asset | PluginFilterType.Collection,
  managedBy?: PluginFilterType.Authority | PluginFilterType.Owner,
  type?: 'checkbox' | 'list',
  message?: string,
}

const pluginSelector = async (options: PluginSelectorOptions): Promise<Plugin | Plugin[]> => {

  const filteredPlugins = pluginList.filter((plugin) => {
    if (options.managedBy) {
      return plugin.managed === options.managedBy
    }
    return plugin.type === options.filter || plugin.type === PluginFilterType.Common
  })

  console.log(filteredPlugins);


  const selectedPlugins = await inquirer
    .prompt([
      /* Pass your questions in here */
      {
        type: options.type ? options.type : 'checkbox',
        name: 'Plugins',
        choices: filteredPlugins.map((plugin) => {
          return {
            name: plugin.name,
            value: plugin.value,
          }
        }), // Add the plugin name and value here
        message: options.message
          ? options.message
          : `Would you like to add any plugins to the ${options.filter === PluginFilterType.Asset ? 'Asset' : 'Collection'}?`,
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

export { pluginSelector }
