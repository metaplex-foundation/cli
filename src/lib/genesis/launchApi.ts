import {
  CreateLaunchInput,
  CreateLaunchpoolLaunchInput,
  CreateBondingCurveLaunchInput,
  QuoteMintInput,
  SvmNetwork,
} from '@metaplex-foundation/genesis'
import { detectSvmNetwork, RpcChain } from '../util.js'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

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
  depositStartTime: string
  // launchpool-specific
  tokenAllocation?: number
  raiseGoal?: number
  raydiumLiquidityBps?: number
  fundsRecipient?: string
}

/* ------------------------------------------------------------------ */
/*  Build function                                                     */
/* ------------------------------------------------------------------ */

export function buildLaunchInput(
  wallet: string,
  chain: RpcChain,
  params: BuildLaunchInputParams,
): CreateLaunchInput {
  const network: SvmNetwork = detectSvmNetwork(chain)

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
  }

  if (params.launchType === 'bondingCurve') {
    return {
      ...common,
      launchType: 'bondingCurve',
      launch: {
        bondingCurve: {
          depositStartTime: params.depositStartTime,
        },
      },
    } satisfies CreateBondingCurveLaunchInput
  }

  // launchpool
  if (!params.tokenAllocation || !params.raiseGoal || !params.raydiumLiquidityBps || !params.fundsRecipient) {
    throw new Error('Launchpool requires tokenAllocation, raiseGoal, raydiumLiquidityBps, and fundsRecipient')
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
