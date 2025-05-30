import { checkbox } from '@inquirer/prompts'
import { Plugin } from '../lib/types/pluginData.js'

export enum PluginFilterType {
  Common,
  Asset,
  Collection,
  Owner,
  Authority,
}

interface PluginOption {
  name: string
  value: Plugin
  type: PluginFilterType
  managed?: PluginFilterType
}

const pluginList: PluginOption[] = [
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
    value: 'immutableMetadata',
    type: PluginFilterType.Common,
    managed: PluginFilterType.Authority
  },
  {
    name: 'Autograph Plugin',
    value: 'autograph',
    type: PluginFilterType.Common,
    managed: PluginFilterType.Owner
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
    value: 'freeze',
    type: PluginFilterType.Asset,
    managed: PluginFilterType.Owner
  },
  {
    name: 'Burn Delegate Plugin',
    value: 'burn',
    type: PluginFilterType.Asset,
    managed: PluginFilterType.Owner
  },
  {
    name: 'Transfer Delegate Plugin',
    value: 'transfer',
    type: PluginFilterType.Asset,
    managed: PluginFilterType.Owner
  },
]

interface PluginSelectorOptions {
  filter: PluginFilterType.Asset | PluginFilterType.Collection,
  managedBy?: PluginFilterType.Authority | PluginFilterType.Owner,
  type?: 'checkbox' | 'list',
  message?: string,
}

export const pluginSelector = async (options: PluginSelectorOptions): Promise<Plugin | Plugin[]> => {
  const filteredPlugins = pluginList.filter((plugin) => {
    if (options.managedBy) {
      return plugin.managed === options.managedBy
    }
    return plugin.type === options.filter || plugin.type === PluginFilterType.Common
  })

  const selectedPlugin = await checkbox({
    message: options.message || `Select plugins to add to your ${options.filter === PluginFilterType.Asset ? 'Asset' : 'Collection'}`,
    loop: false,
    pageSize: 99,
    choices: filteredPlugins.map(plugin => ({
      name: plugin.name,
      value: plugin.value
    }))
    
  })

  return selectedPlugin
}
