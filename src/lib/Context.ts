import {mplCore} from '@metaplex-foundation/mpl-core'
import {
  Commitment,
  Signer,
  Umi,
  createNoopSigner,
  generateSigner,
  signerIdentity,
  signerPayer,
} from '@metaplex-foundation/umi'
import {createUmi} from '@metaplex-foundation/umi-bundle-defaults'
import {existsSync, lstatSync} from 'node:fs'

import {createSignerFromFile} from './FileSigner.js'
import {createSignerFromLedgerPath} from './LedgerSigner.js'
import {readJsonSync} from './file.js'
import {DUMMY_UMI} from './util.js'

export type ConfigJson = {
  commitment?: Commitment
  keypair?: string
  payer?: string
  rpcUrl?: string
}

export type Context = {
  commitment: Commitment
  payer?: Signer
  rpcUrl: string
  signer: Signer
  umi: Umi
}

export const DEFAULT_CONFIG = {
  commitment: 'confirmed' as Commitment,
  keypair: '~/.config/solana/id.json',
  rpcUrl: 'https://api.devnet.solana.com',
}

export const CONFIG_KEYS: Array<keyof ConfigJson> = ['keypair', 'payer', 'rpcUrl', 'commitment']

export const getDefaultConfigPath = (prefix: string): string => `${prefix}/config.json`

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

export const createSignerFromPath = async (path: string): Promise<Signer> => {
  if (path.startsWith('usb://ledger')) {
    return createSignerFromLedgerPath(path)
  }

  if (existsSync(path)) {
    return createSignerFromFile(path)
  }

  // TODO move this warning to a better place
  console.log('[warning]: No keypair specified, using temporary noop-signer')
  // create no-op signer if no key is specified
  const kp = generateSigner(DUMMY_UMI)
  return createNoopSigner(kp.publicKey)
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

export const createContext = async (configPath: string, overrides: ConfigJson): Promise<Context> => {
  const config: ConfigJson = consolidateConfigs(DEFAULT_CONFIG, readConfig(configPath), overrides)

  const signer = await createSignerFromPath(config.keypair!)

  const payer = config.payer ? await createSignerFromPath(config.payer) : signer
  const umi = createUmi(config.rpcUrl!, {
    commitment: config.commitment!,
  })

  umi.use(signerIdentity(signer)).use(signerPayer(payer)).use(mplCore())

  return {
    commitment: config.commitment!,
    payer,
    rpcUrl: config.rpcUrl!,
    signer,
    umi,
  }
}
