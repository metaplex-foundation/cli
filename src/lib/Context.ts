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
import { DUMMY_UMI } from './util.js'
import { abort } from 'node:process'

export type ConfigJson = {
  commitment?: Commitment
  keypair?: string
  payer?: string
  rpcUrl?: string
  storage?: {
    name: 'irys' | 'arTurbo'
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
  explorer?: string
}

export type Context = {
  commitment: Commitment
  payer?: Signer
  rpcUrl: string
  signer: Signer
  umi: Umi
  explorer: string
}

export const DEFAULT_CONFIG = {
  commitment: 'confirmed' as Commitment,
  rpcUrl: 'https://api.devnet.solana.com',
  storage: {
    name: 'irys' as const,
    options: {},
  },
  explorer: 'solanaExplorer',
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

export const getDefaultConfigPath = (prefix: string): string => {
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
    throw new Error('No keypair path provided')
  }

  if (path.startsWith('usb://ledger')) {
    return createSignerFromLedgerPath(path)
  }

  if (existsSync(path)) {
    return createSignerFromFile(path)
  }

  throw new Error('Keypair file not found at: ' + path + ' please check your config file or use the --keypair flag')

  // // Provide a more descriptive error message
  // console.log(`[warning]: Keypair file not found at: ${path}`)
  // console.log('[info]: Using temporary noop-signer. To use your keypair:')
  // console.log('  1. Create a keypair file at the specified path')
  // console.log('  2. Or update the keypair path in your config file')
  // console.log('  3. Or specify a different keypair path with --keypair flag')
  
  // // create no-op signer if no key is specified
  // const kp = generateSigner(DUMMY_UMI)
  // return createNoopSigner(kp.publicKey)
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

export const createContext = async (configPath: string, overrides: ConfigJson, transactionContext: boolean = false): Promise<Context> => {
  const config: ConfigJson = consolidateConfigs(DEFAULT_CONFIG, readConfig(configPath), overrides)

  console.log({data: {
    transactionContext,
    config: config.keypair,
    overrides: overrides.keypair,
  }})

  // if transactionContext is true, we need to make sure we have a valid keypair either in the config or overrides
  if (transactionContext === true && !config.keypair && !overrides.keypair) {
    throw new Error('No keypair specified in config or args. Please set a keypair path in your config file or use --keypair flag.')
  }

  const signer = config.keypair ? await createSignerFromPath(config.keypair) : createNoopSigner()

  const payer = config.payer ? await createSignerFromPath(config.payer) : signer

  const umi = createUmi(config.rpcUrl! , {
    commitment: config.commitment!,
  })

  umi.use(signerIdentity(signer))
  .use(signerPayer(payer))
  .use(mplCore())
  .use(mplTokenMetadata())
  .use(mplToolbox())

  const storageProvider = await initStorageProvider(umi, config)
  storageProvider && umi.use(storageProvider)


  return {
    commitment: config.commitment!,
    payer,
    rpcUrl: config.rpcUrl!,
    signer,
    umi,
    explorer: config.explorer || DEFAULT_CONFIG.explorer,
  }
}
