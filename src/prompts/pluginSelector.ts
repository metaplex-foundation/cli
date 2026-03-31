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
    name: 'Add Blocker Plugin',
    value: 'addBlocker',
    type: PluginFilterType.Common,
    managed: PluginFilterType.Authority
  },
  {
    name: 'Attributes Plugin',
    value: 'attributes',
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
    name: 'Bubblegum V2 Plugin',
    value: 'bubblegumV2',
    type: PluginFilterType.Collection,
    managed: PluginFilterType.Authority
  },
  {
    name: 'Burn Delegate Plugin',
    value: 'burn',
    type: PluginFilterType.Asset,
    managed: PluginFilterType.Owner
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
    name: 'Immutable Metadata Plugin',
    value: 'immutableMetadata',
    type: PluginFilterType.Common,
    managed: PluginFilterType.Authority
  },
  {
    name: 'Master Edition Plugin',
    value: 'masterEdition',
    type: PluginFilterType.Collection,
    managed: PluginFilterType.Authority
  },
  {
    name: 'Permanent Burn Plugin',
    value: 'pBurn',
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
    name: 'Royalty Plugin',
    value: 'royalties',
    type: PluginFilterType.Common,
    managed: PluginFilterType.Authority
  },
  {
    name: 'Transfer Delegate Plugin',
    value: 'transfer',
    type: PluginFilterType.Asset,
    managed: PluginFilterType.Owner
  },
  {
    name: 'Update Delegate Plugin',
    value: 'update',
    type: PluginFilterType.Common,
    managed: PluginFilterType.Authority
  },
  {
    name: 'Verified Creators Plugin',
    value: 'verifiedCreators',
    type: PluginFilterType.Common,
    managed: PluginFilterType.Owner
  },
]

// Defines which plugins are allowed to coexist.
// Key = plugin that imposes constraints, Value = set of plugins it allows.
// Plugins not listed here have no constraints.
const pluginAllowLists: Partial<Record<Plugin, Set<Plugin>>> = {
  bubblegumV2: new Set([
    'attributes',
    'royalties',
    'update',
    'pFreeze',
    'pTransfer',
    'pBurn',
  ]),
}

// Given a set of selected plugins, returns the set of plugins still eligible.
const getCompatiblePlugins = (selected: Plugin[]): Set<Plugin> | null => {
  let allowed: Set<Plugin> | null = null

  for (const plugin of selected) {
    const allowList = pluginAllowLists[plugin]
    if (!allowList) continue

    // The plugin that owns the allow list is always compatible with itself
    const withSelf = new Set<Plugin>([...allowList, plugin])

    if (allowed === null) {
      allowed = withSelf
    } else {
      // Intersect: only keep plugins allowed by all constraining plugins
      const intersection = new Set<Plugin>()
      for (const p of allowed) {
        if (withSelf.has(p)) intersection.add(p)
      }
      allowed = intersection
    }
  }

  return allowed
}

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

// Validates that a set of selected plugins are compatible with each other.
// Returns an error message if incompatible, or null if valid.
export const validatePluginCompatibility = (selected: Plugin[]): string | null => {
  const compatible = getCompatiblePlugins(selected)
  if (compatible === null) return null

  const incompatible = selected.filter(p => !compatible.has(p))
  if (incompatible.length === 0) return null

  const constraining = selected.filter(p => pluginAllowLists[p])
  return `Plugin(s) ${incompatible.join(', ')} cannot be used together with ${constraining.join(', ')}.`
}
