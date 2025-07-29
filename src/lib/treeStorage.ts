import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { Umi } from '@metaplex-foundation/umi'

export interface StoredTree {
  name: string
  address: string
  maxDepth: number
  maxBufferSize: number
  canopyDepth: number
  isPublic: boolean
  maxNfts: number
  createdAt: string
  signature: string
  network: 'mainnet' | 'devnet' | 'testnet' | 'localnet'
  genesisHash: string
}

export const getNetworkFromGenesisHash = (genesisHash: string): 'mainnet' | 'devnet' | 'testnet' | 'localnet' => {
  switch (genesisHash) {
    case '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d':
      return 'mainnet'
    case 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG':
      return 'devnet'
    case '4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY':
      return 'testnet'
    default:
      return 'localnet'
  }
}

// TODO: This genesis hash functionality is already implemented in another PR waiting to be merged.
// This will be refactored later to use the shared implementation.
export const getNetworkInfo = async (umi: Umi): Promise<{ network: 'mainnet' | 'devnet' | 'testnet' | 'localnet', genesisHash: string }> => {
  try {
    const genesisHash = await umi.rpc.getGenesisHash()
    const network = getNetworkFromGenesisHash(genesisHash)
    return { network, genesisHash }
  } catch (error) {
    console.warn('Failed to get genesis hash, defaulting to localnet:', error)
    return { network: 'localnet', genesisHash: 'unknown' }
  }
}

export const getTreesFilePath = (): string => {
  const homeDir = process.env.HOME || process.env.USERPROFILE
  if (!homeDir) {
    throw new Error('Could not determine home directory')
  }
  return join(homeDir, '.config', 'mplx', 'trees.json')
}

export const ensureTreesFileExists = (): void => {
  const treesPath = getTreesFilePath()
  const dirPath = dirname(treesPath)
  
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true })
  }
  
  if (!existsSync(treesPath)) {
    writeFileSync(treesPath, JSON.stringify([], null, 2))
  }
}

export const loadTrees = (): StoredTree[] => {
  ensureTreesFileExists()
  const treesPath = getTreesFilePath()
  
  try {
    const content = readFileSync(treesPath, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    console.warn('Failed to load trees file, returning empty array:', error)
    return []
  }
}

export const saveTrees = (trees: StoredTree[]): void => {
  ensureTreesFileExists()
  const treesPath = getTreesFilePath()
  writeFileSync(treesPath, JSON.stringify(trees, null, 2))
}

export const saveTree = (tree: StoredTree): void => {
  const trees = loadTrees()
  
  // Check if tree name already exists for this network
  const existingIndex = trees.findIndex(t => t.name === tree.name && t.network === tree.network)
  if (existingIndex >= 0) {
    throw new Error(`Tree with name "${tree.name}" already exists on ${tree.network}. Please choose a different name.`)
  }
  
  // Check if tree address already exists
  const existingAddressIndex = trees.findIndex(t => t.address === tree.address)
  if (existingAddressIndex >= 0) {
    throw new Error(`Tree with address "${tree.address}" already exists with name "${trees[existingAddressIndex].name}" on ${trees[existingAddressIndex].network}.`)
  }
  
  trees.push(tree)
  saveTrees(trees)
}

export const getTreeByNameOrAddress = (nameOrAddress: string, network?: 'mainnet' | 'devnet' | 'testnet' | 'localnet'): StoredTree | undefined => {
  const trees = loadTrees()
  
  if (network) {
    // If network is specified, filter by network first
    return trees.find(tree => 
      (tree.name === nameOrAddress || tree.address === nameOrAddress) && 
      tree.network === network
    )
  }
  
  // If no network specified, return first match
  return trees.find(tree => tree.name === nameOrAddress || tree.address === nameOrAddress)
}

export const listTrees = (network?: 'mainnet' | 'devnet' | 'testnet' | 'localnet'): StoredTree[] => {
  const trees = loadTrees()
  
  if (network) {
    return trees.filter(tree => tree.network === network)
  }
  
  return trees
}

export const removeTree = (nameOrAddress: string, network?: 'mainnet' | 'devnet' | 'testnet' | 'localnet'): boolean => {
  const trees = loadTrees()
  const initialLength = trees.length
  
  let filteredTrees: StoredTree[]
  if (network) {
    filteredTrees = trees.filter(tree => 
      !((tree.name === nameOrAddress || tree.address === nameOrAddress) && tree.network === network)
    )
  } else {
    filteredTrees = trees.filter(tree => tree.name !== nameOrAddress && tree.address !== nameOrAddress)
  }
  
  if (filteredTrees.length < initialLength) {
    saveTrees(filteredTrees)
    return true
  }
  
  return false
}

export const isValidTreeName = (name: string): boolean => {
  // Allow alphanumeric, hyphens, underscores, and spaces
  return /^[a-zA-Z0-9\-_ ]+$/.test(name) && name.length >= 1 && name.length <= 50
}