import { mplCore } from '@metaplex-foundation/mpl-core'
import { mplBubblegum } from '@metaplex-foundation/mpl-bubblegum'
import {
  Commitment,
  Signer,
  Umi,
  createNoopSigner as createUmiNoopSigner,
  generateSigner,
  publicKey,
  signerIdentity,
  signerPayer,
} from '@metaplex-foundation/umi'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { existsSync, lstatSync } from 'node:fs'
import { join } from 'node:path'

import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata'
import { mplToolbox } from '@metaplex-foundation/mpl-toolbox'
import { mplDistro } from '@metaplex-foundation/mpl-distro'
import { genesis } from '@metaplex-foundation/genesis'
import { IrysUploaderOptions } from '@metaplex-foundation/umi-uploader-irys'
import { createSignerFromFile } from './FileSigner.js'
import { createSignerFromLedgerPath } from './LedgerSigner.js'
import { readJsonSync } from './file.js'
import initStorageProvider from './uploader/initStorageProvider.js'
import { DUMMY_UMI, RpcChain, chain as getChain } from './util.js'
import { ExplorerType } from '../explorers.js'
import { assetSignerPlugin } from './umi/assetSignerPlugin.js'
import { mplCandyMachine } from '@metaplex-foundation/mpl-core-candy-machine'
import { dasApi, type DasApiInterface } from '@metaplex-foundation/digital-asset-standard-api'

export type WalletEntry = {
  name: string
  address: string
} & (
  | { type?: 'file'; path: string }
  | { type: 'asset-signer'; asset: string; payer?: string }
)

export type ConfigJson = {
  commitment?: Commitment
  keypair?: string
  payer?: string
  rpcUrl?: string
  storage?: {
    name: 'irys' | 'cascade' | 'turbo'
    options: IrysUploaderOptions
  }
  wallets?: WalletEntry[]
  rpcs?: {
    name: string
    endpoint: string
  }[]
  explorer?: ExplorerType
  activeWallet?: string
}

export type AssetSignerInfo = {
  asset: string
}

export type Context = {
  commitment: Commitment
  payer?: Signer
  rpcUrl: string
  signer: Signer
  umi: Umi & { rpc: DasApiInterface }
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
  'activeWallet',
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

/**
 * Resolves the active wallet from config. Returns the wallet entry if an
 * asset-signer wallet is active, or undefined for standard wallets.
 */
const resolveActiveWallet = (config: ConfigJson): WalletEntry | undefined => {
  if (!config.activeWallet || !config.wallets) return undefined
  return config.wallets.find(w => w.name === config.activeWallet)
}

export const createContext = async (configPath: string, overrides: ConfigJson, isTransactionContext: boolean = false): Promise<Context> => {
  const config: ConfigJson = consolidateConfigs(DEFAULT_CONFIG, readConfig(configPath), overrides)

  // Check if the active wallet is an asset-signer.
  // An explicit --keypair flag overrides the asset-signer wallet.
  const activeWallet = overrides.keypair ? undefined : resolveActiveWallet(config)
  const isAssetSigner = activeWallet?.type === 'asset-signer'

  let signer: Signer
  let assetSigner: AssetSignerInfo | undefined
  let payerPath: string | undefined = config.payer
  let pdaIdentity: Signer | undefined
  let realWalletSigner: Signer | undefined

  if (isAssetSigner) {
    // Asset-signer mode: umi.identity AND umi.payer = noopSigner(PDA) so
    // instructions are built with the PDA for all accounts naturally.
    // The send layer wraps in execute() with the asset owner as authority
    // and the fee payer (which can differ via -p).

    // Resolve the asset owner wallet (authority on the execute instruction).
    // This is always the wallet configured on the asset-signer entry.
    let ownerPath: string | undefined
    const walletPayerName = activeWallet.payer
    if (walletPayerName && config.wallets) {
      const ownerWallet = config.wallets.find(w => w.name === walletPayerName)
      if (ownerWallet && ownerWallet.type !== 'asset-signer' && 'path' in ownerWallet) {
        ownerPath = ownerWallet.path
      }
    }

    if (!ownerPath) {
      ownerPath = config.keypair
    }

    if (!ownerPath && isTransactionContext) {
      throw new Error(
        `Asset-signer wallet '${activeWallet.name}' could not resolve an owner wallet.\n` +
        `Ensure the asset owner is a saved wallet, or set a default keypair in your config.`
      )
    }

    if (ownerPath) {
      realWalletSigner = await createSignerFromPath(ownerPath)
      signer = realWalletSigner
    } else {
      signer = createNoopSigner()
    }

    // Identity is a noop signer keyed to the PDA — instructions naturally
    // use the PDA address. The send layer wraps them in execute().
    pdaIdentity = createUmiNoopSigner(publicKey(activeWallet.address))
    assetSigner = { asset: activeWallet.asset }
  } else if (isTransactionContext) {
    signer = await createSignerFromPath(overrides.keypair || config.keypair)
  } else {
    signer = config.keypair ? await createSignerFromPath(config.keypair) : createNoopSigner()
  }

  // For asset-signer mode, payer is already set as assetSignerPayer above.
  // For normal mode, resolve payer from payerPath or fall back to signer.
  const payer = isAssetSigner ? signer : (payerPath ? await createSignerFromPath(payerPath) : signer)

  const umi = createUmi(config.rpcUrl!, {
    commitment: config.commitment!,
  })

  if (isAssetSigner) {
    // Both identity and payer = noopSigner(PDA). Instructions are built with
    // the PDA for all accounts. The send layer overrides the transaction fee
    // payer to the real wallet via setFeePayer() before buildAndSign.
    umi.use(signerIdentity(pdaIdentity!))
      .use(signerPayer(pdaIdentity!))
  } else {
    umi.use(signerIdentity(signer))
      .use(signerPayer(payer))
  }

  umi.use(mplCore())
    .use(mplTokenMetadata())
    .use(mplToolbox())
    .use(mplBubblegum())
    .use(mplDistro())
    .use(mplCandyMachine())
    .use(genesis())
    .use(dasApi())

  if (assetSigner && realWalletSigner) {
    // Resolve fee payer: -p flag overrides, otherwise the owner pays.
    const feePayer = payerPath
      ? await createSignerFromPath(payerPath)
      : realWalletSigner
    umi.use(assetSignerPlugin({ info: assetSigner, authority: realWalletSigner, payer: feePayer }))
  }

  const storageProvider = await initStorageProvider(config)
  storageProvider && umi.use(storageProvider)

  const chain = await getChain(config.rpcUrl || DEFAULT_CONFIG.rpcUrl)

  return {
    commitment: config.commitment!,
    payer,
    rpcUrl: config.rpcUrl!,
    signer,
    umi: umi as Umi & { rpc: DasApiInterface },
    explorer: config.explorer || DEFAULT_CONFIG.explorer,
    chain,
  }
}


