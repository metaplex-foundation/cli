import { mplCore } from '@metaplex-foundation/mpl-core'
import {
  Commitment,
  Signer,
  Umi,
  createNoopSigner as createUmiNoopSigner,
  generateSigner,
  signerIdentity,
  signerPayer,
} from '@metaplex-foundation/umi'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { existsSync, lstatSync } from 'node:fs'
import { join } from 'node:path'

import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata'
import { mplToolbox } from '@metaplex-foundation/mpl-toolbox'
import { IrysUploaderOptions } from '@metaplex-foundation/umi-uploader-irys'
import { createSignerFromFile } from './FileSigner.js'
import { createSignerFromLedgerPath } from './LedgerSigner.js'
import { readJsonSync } from './file.js'
import initStorageProvider from './uploader/initStorageProvider.js'
import { DUMMY_UMI, RpcChain, chain as getChain } from './util.js'
import { ExplorerType } from '../explorers.js'
import { mplCandyMachine } from '@metaplex-foundation/mpl-core-candy-machine'

export type ConfigJson = {
  commitment?: Commitment
  keypair?: string
  payer?: string
  rpcUrl?: string
  storage?: {
    name: 'irys' | 'cascade'
    options: IrysUploaderOptions
  }
  wallets?: {
    name: string
    path: string
    address: string
  }[]
  rpcs?: {
    name: string
    endpoint: string
  }[]
  explorer?: ExplorerType
}

export type Context = {
  commitment: Commitment
  payer?: Signer
  rpcUrl: string
  signer: Signer
  umi: Umi
  explorer: ExplorerType
  chain: RpcChain
}

export const DEFAULT_CONFIG = {
  commitment: 'confirmed' as Commitment,
  rpcUrl: 'https://api.devnet.solana.com',
  storage: {
    name: 'irys' as const,
    options: {},
  },
  explorer: 'solanaExplorer' as ExplorerType,
}

export const CONFIG_KEYS: Array<keyof ConfigJson> = [
  'keypair',
  'payer',
  'rpcUrl',
  'commitment',
  'storage',
  'wallets',
  'rpcs',
  'explorer',
]

export const getDefaultConfigPath = (): string => {
  const homeDir = process.env.HOME || process.env.USERPROFILE
  if (!homeDir) {
    throw new Error('Could not determine home directory')
  }
  return join(homeDir, '.config', 'mplx', 'config.json')
}

export const readConfig = (path: string): ConfigJson => {
  if (!existsSync(path)) {
    return {}
  }

  if (lstatSync(path).isDirectory()) {
    throw new Error(`Config file path is a directory, expected a file: ${path}`)
  }

  const configJson = readJsonSync(path)
  const filteredConfig: ConfigJson = {}

  for (const key of CONFIG_KEYS) {
    filteredConfig[key] = configJson[key]
  }

  return filteredConfig
}

export const createSignerFromPath = async (path: string | undefined): Promise<Signer> => {
  if (!path) {
    throw new Error('No keypair specified in config or args. Please set a keypair path in your config file or use --keypair flag.')
  }

  if (path.startsWith('usb://ledger')) {
    return createSignerFromLedgerPath(path)
  }

  if (existsSync(path)) {
    return createSignerFromFile(path)
  }

  throw new Error('Keypair file not found at: ' + path + ' please check your config file or use the --keypair flag')
}

export const createNoopSigner = (): Signer => {
  const kp = generateSigner(DUMMY_UMI)
  return createUmiNoopSigner(kp.publicKey)
}

export function consolidateConfigs<T>(...configs: Partial<ConfigJson>[]): ConfigJson {
  return configs.reduce((acc: ConfigJson, config) => {
    for (const key in config) {
      if (config.hasOwnProperty(key)) {
        const value = config[key as keyof ConfigJson]
        if (value !== undefined) {
          acc[key as keyof ConfigJson] = value as any
        }
      }
    }

    return acc
  }, {} as ConfigJson)
}

export const createContext = async (configPath: string, overrides: ConfigJson, isTransactionContext: boolean = false): Promise<Context> => {
  const config: ConfigJson = consolidateConfigs(DEFAULT_CONFIG, readConfig(configPath), overrides)

  let signer: Signer
  if (isTransactionContext) {
    signer = await createSignerFromPath(config.keypair)
  } else {
    signer = config.keypair ? await createSignerFromPath(config.keypair) : createNoopSigner()
  }

  const payer = config.payer ? await createSignerFromPath(config.payer) : signer

  const umi = createUmi(config.rpcUrl!, {
    commitment: config.commitment!,
  })

  umi.use(signerIdentity(signer))
    .use(signerPayer(payer))
    .use(mplCore())
    .use(mplTokenMetadata())
    .use(mplToolbox())
    .use(mplCandyMachine())

  const storageProvider = await initStorageProvider(config)
  storageProvider && umi.use(storageProvider)

  const chain = await getChain(config.rpcUrl || DEFAULT_CONFIG.rpcUrl)

  return {
    commitment: config.commitment!,
    payer,
    rpcUrl: config.rpcUrl!,
    signer,
    umi,
    explorer: config.explorer || DEFAULT_CONFIG.explorer,
    chain,
  }
}
