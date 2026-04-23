import {
  CreateLaunchInput,
  CreateLaunchpoolLaunchInput,
  CreateBondingCurveLaunchInput,
  QuoteMintInput,
  SvmNetwork,
} from '@metaplex-foundation/genesis'
import { PublicKeyInput } from '@metaplex-foundation/umi'
import { detectSvmNetwork, RpcChain } from '../util.js'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface AgentConfig {
  /** Agent Core asset address */
  mint: PublicKeyInput
  /** Whether to set the token on the agent */
  setToken: boolean
}

export interface BuildLaunchInputParams {
  launchType: 'launchpool' | 'bondingCurve'
  token: {
    name: string
    symbol: string
    image: string
    description?: string
  }
  socials?: {
    website?: string
    twitter?: string
    telegram?: string
  }
  quoteMint?: string
  // launchpool-specific
  depositStartTime?: string
  tokenAllocation?: number
  raiseGoal?: number
  raydiumLiquidityBps?: number
  fundsRecipient?: string
  // bonding-curve-specific
  creatorFeeWallet?: string
  firstBuyAmount?: number
  // agent support
  agent?: AgentConfig
}

/* ------------------------------------------------------------------ */
/*  API URL helpers                                                    */
/* ------------------------------------------------------------------ */

const API_URLS: Record<SvmNetwork, string> = {
  'solana-mainnet': 'https://api.metaplex.com',
  'solana-devnet': 'https://api.metaplex.dev',
}

export function getDefaultApiUrl(network: SvmNetwork): string {
  return API_URLS[network] ?? API_URLS['solana-mainnet']
}

/* ------------------------------------------------------------------ */
/*  Build function                                                     */
/* ------------------------------------------------------------------ */

export function buildLaunchInput(
  wallet: string,
  chain: RpcChain,
  params: BuildLaunchInputParams,
  networkOverride?: SvmNetwork,
): CreateLaunchInput {
  const network: SvmNetwork = networkOverride ?? detectSvmNetwork(chain)

  const externalLinks: Record<string, string> = {}
  if (params.socials?.website) externalLinks.website = params.socials.website
  if (params.socials?.twitter) externalLinks.twitter = params.socials.twitter
  if (params.socials?.telegram) externalLinks.telegram = params.socials.telegram

  const common = {
    wallet,
    token: {
      name: params.token.name,
      symbol: params.token.symbol,
      image: params.token.image,
      ...(params.token.description && { description: params.token.description }),
      ...(Object.keys(externalLinks).length > 0 && { externalLinks }),
    },
    network,
    ...(params.quoteMint && params.quoteMint !== 'SOL' && {
      quoteMint: params.quoteMint as QuoteMintInput,
    }),
    ...(params.agent && { agent: params.agent }),
  }

  if (params.launchType === 'bondingCurve') {
    return {
      ...common,
      launchType: 'bondingCurve',
      launch: {
        ...(params.creatorFeeWallet && { creatorFeeWallet: params.creatorFeeWallet }),
        ...(params.firstBuyAmount !== undefined && params.firstBuyAmount > 0 && { firstBuyAmount: params.firstBuyAmount }),
      },
    } satisfies CreateBondingCurveLaunchInput
  }

  // launchpool
  if (!params.tokenAllocation || !params.raiseGoal || !params.raydiumLiquidityBps || !params.fundsRecipient || !params.depositStartTime) {
    throw new Error('Launchpool requires tokenAllocation, raiseGoal, raydiumLiquidityBps, fundsRecipient, and depositStartTime')
  }

  return {
    ...common,
    launchType: 'launchpool',
    launch: {
      launchpool: {
        tokenAllocation: params.tokenAllocation,
        depositStartTime: params.depositStartTime,
        raiseGoal: params.raiseGoal,
        raydiumLiquidityBps: params.raydiumLiquidityBps,
        fundsRecipient: params.fundsRecipient,
      },
    },
  } satisfies CreateLaunchpoolLaunchInput
}
