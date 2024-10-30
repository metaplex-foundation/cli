import { Commitment, createNoopSigner, generateSigner, Signer, signerIdentity, signerPayer, Umi } from "@metaplex-foundation/umi"
import { existsSync, lstatSync, PathLike, PathOrFileDescriptor } from "fs"
import { readJsonSync } from "./file.js"
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { createSignerFromFile } from "./FileSigner.js"
import { mplCore } from "@metaplex-foundation/mpl-core"
import { createSignerFromLedgerPath } from "./LedgerSigner.js"
import { DUMMY_UMI } from "./util.js"

export type ConfigJson = {
  keypair?: string,
  payer?: string,
  rpcUrl?: string,
  commitment?: Commitment
}

export type Context = {
  signer: Signer,
  payer?: Signer,
  rpcUrl: string,
  umi: Umi,
  commitment: Commitment
}

export const DEFAULT_CONFIG = {
  keypair: '~/.config/solana/id.json',
  rpcUrl: 'https://api.devnet.solana.com',
  commitment: 'confirmed' as Commitment
}

export const CONFIG_KEYS: Array<keyof ConfigJson> = ['keypair', 'payer', 'rpcUrl', 'commitment']

export const getDefaultConfigPath = (prefix: string): string => {
  return `${prefix}/config.json`
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

  CONFIG_KEYS.forEach((key) => {
    filteredConfig[key] = configJson[key]
  })

  return filteredConfig
}

export const createSignerFromPath = async (path: string): Promise<Signer> => {
  if (path.startsWith('usb://')) {
    return createSignerFromLedgerPath(path)
  } else if (existsSync(path)) {
    return createSignerFromFile(path)
  } else {
    // TODO move this warning to a better place
    console.log('[warning]: No keypair specified, using temporary noop-signer')
    // create no-op signer if no key is specified
    const kp = generateSigner(DUMMY_UMI)
    return createNoopSigner(kp.publicKey)
  }
}

export function consolidateConfigs<T>(...configs: Partial<ConfigJson>[]): ConfigJson {
  return configs.reduce((acc: ConfigJson, config) => {
    for (const key in config) {
      if (config.hasOwnProperty(key)) {
        const value = config[key as keyof ConfigJson];
        if (value !== undefined) {
          acc[key as keyof ConfigJson] = value as any;
        }
      }
    }
    return acc;
  }, {} as ConfigJson);
}

export const createContext = async (configPath: string, overrides: ConfigJson): Promise<Context> => {
  const config: ConfigJson = consolidateConfigs(
    DEFAULT_CONFIG,
    readConfig(configPath),
    overrides
  )

  const signer = await createSignerFromPath(config.keypair!)

  const payer = config.payer ? await createSignerFromPath(config.payer) : signer
  const umi = createUmi(config.rpcUrl!, {
    commitment: config.commitment!
  })

  umi
    .use(signerIdentity(signer))
    .use(signerPayer(payer))
    .use(mplCore())

  return {
    signer,
    payer,
    rpcUrl: config.rpcUrl!,
    commitment: config.commitment!,
    umi,
  }

}


