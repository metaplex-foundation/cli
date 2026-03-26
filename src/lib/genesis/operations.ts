import {
  initializeV2,
  findGenesisAccountV2Pda,
  addLaunchPoolBucketV2Base,
  addLaunchPoolBucketV2Extensions,
  addPresaleBucketV2,
  addUnlockedBucketV2,
  finalizeV2,
  createTimeAbsoluteCondition,
  findLaunchPoolBucketV2Pda,
  findPresaleBucketV2Pda,
  findUnlockedBucketV2Pda,
  WRAPPED_SOL_MINT,
} from '@metaplex-foundation/genesis'
import {
  Umi,
  Signer,
  PublicKey,
  AccountMeta,
  generateSigner,
  publicKey,
  none,
  some,
} from '@metaplex-foundation/umi'

import umiSendAndConfirmTransaction from '../umi/sendAndConfirm.js'
import { txSignatureToString } from '../util.js'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface CreateGenesisParams {
  name: string
  symbol: string
  totalSupply: string
  decimals: number
  uri: string
  fundingMode: 'new-mint' | 'transfer'
  baseMint?: string
  quoteMint?: string
  genesisIndex?: number
}

export interface AddLaunchPoolParams {
  allocation: string
  bucketIndex: number
  depositStart: string
  depositEnd: string
  claimStart: string
  claimEnd: string
  minimumDeposit?: string
  depositLimit?: string
  minimumQuoteTokenThreshold?: string
}

export interface AddPresaleParams {
  allocation: string
  quoteCap: string
  bucketIndex: number
  depositStart: string
  depositEnd: string
  claimStart: string
  claimEnd: string
  minimumDeposit?: string
  depositLimit?: string
}

export interface AddUnlockedParams {
  recipient: string
  allocation: string
  bucketIndex: number
  claimStart: string
  claimEnd: string
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const FUNDING_MODE = {
  NewMint: 0,
  Transfer: 1,
} as const

function makeCondition(timestamp: string) {
  return {
    __kind: 'TimeAbsolute' as const,
    padding: new Array(47).fill(0),
    time: BigInt(timestamp),
    triggeredTimestamp: BigInt(0),
  }
}

/* ------------------------------------------------------------------ */
/*  Create Genesis Account                                             */
/* ------------------------------------------------------------------ */

export async function createGenesisAccount(
  umi: Umi,
  signer: Signer,
  payer: Signer | undefined,
  params: CreateGenesisParams,
): Promise<{
  genesisAccountPda: PublicKey
  baseMintPubkey: PublicKey
  quoteMintPubkey: PublicKey
  signature: string
}> {
  const fundingMode = params.fundingMode === 'transfer'
    ? FUNDING_MODE.Transfer
    : FUNDING_MODE.NewMint

  let baseMint: Signer | PublicKey
  if (fundingMode === FUNDING_MODE.Transfer) {
    if (!params.baseMint) {
      throw new Error('baseMint is required when using fundingMode=transfer')
    }
    baseMint = publicKey(params.baseMint)
  } else {
    baseMint = generateSigner(umi)
  }

  const quoteMint = params.quoteMint
    ? publicKey(params.quoteMint)
    : WRAPPED_SOL_MINT

  if (!/^\d+$/.test(params.totalSupply)) {
    throw new Error(`Invalid totalSupply "${params.totalSupply}". Must be a non-negative integer string.`)
  }
  const totalSupply = BigInt(params.totalSupply)
  const genesisIndex = params.genesisIndex ?? 0

  const transaction = initializeV2(umi, {
    baseMint,
    quoteMint,
    authority: signer,
    payer,
    fundingMode,
    totalSupplyBaseToken: totalSupply,
    name: params.name,
    symbol: params.symbol,
    uri: params.uri,
    decimals: params.decimals,
    genesisIndex,
  })

  const result = await umiSendAndConfirmTransaction(umi, transaction)

  const baseMintPubkey: PublicKey = 'publicKey' in baseMint ? baseMint.publicKey : baseMint
  const [genesisAccountPda] = findGenesisAccountV2Pda(umi, {
    baseMint: baseMintPubkey,
    genesisIndex,
  })

  const signature = txSignatureToString(result.transaction.signature as Uint8Array)

  return {
    genesisAccountPda,
    baseMintPubkey,
    quoteMintPubkey: quoteMint,
    signature,
  }
}

/* ------------------------------------------------------------------ */
/*  Add Launch Pool Bucket                                             */
/* ------------------------------------------------------------------ */

export async function addLaunchPoolBucket(
  umi: Umi,
  signer: Signer,
  payer: Signer | undefined,
  genesisAccount: PublicKey,
  baseMint: PublicKey,
  quoteMint: PublicKey,
  params: AddLaunchPoolParams,
): Promise<{ bucketPda: PublicKey; signature: string }> {
  const depositStartCondition = createTimeAbsoluteCondition(BigInt(params.depositStart))
  const depositEndCondition = createTimeAbsoluteCondition(BigInt(params.depositEnd))
  const claimStartCondition = createTimeAbsoluteCondition(BigInt(params.claimStart))
  const claimEndCondition = createTimeAbsoluteCondition(BigInt(params.claimEnd))

  const [bucketPda] = findLaunchPoolBucketV2Pda(umi, {
    genesisAccount,
    bucketIndex: params.bucketIndex,
  })

  // Transaction 1: Create the bucket base
  const baseTx = addLaunchPoolBucketV2Base(umi, {
    genesisAccount,
    baseMint,
    quoteMint,
    authority: signer,
    payer,
    bucketIndex: params.bucketIndex,
    baseTokenAllocation: BigInt(params.allocation),
    depositStartCondition,
    depositEndCondition,
    claimStartCondition,
    claimEndCondition,
  })

  const result = await umiSendAndConfirmTransaction(umi, baseTx)
  const signature = txSignatureToString(result.transaction.signature as Uint8Array)

  // Transaction 2: Add extensions if any optional fields were provided
  const extensions = []

  if (params.depositLimit) {
    extensions.push({ __kind: 'DepositLimit' as const, depositLimit: { limit: BigInt(params.depositLimit) } })
  }
  if (params.minimumDeposit) {
    extensions.push({ __kind: 'MinimumDepositAmount' as const, minimumDepositAmount: { amount: BigInt(params.minimumDeposit) } })
  }
  if (params.minimumQuoteTokenThreshold) {
    extensions.push({ __kind: 'MinimumQuoteTokenThreshold' as const, minimumQuoteTokenThreshold: { amount: BigInt(params.minimumQuoteTokenThreshold) } })
  }

  if (extensions.length > 0) {
    const extensionsTx = addLaunchPoolBucketV2Extensions(umi, {
      authority: signer,
      bucket: bucketPda,
      extensions,
      genesisAccount,
      padding: Array.from({ length: 3 }, () => 0),
      payer,
    })
    try {
      await umiSendAndConfirmTransaction(umi, extensionsTx)
    } catch (err) {
      throw new Error(`Bucket created but extensions failed. Bucket PDA: ${bucketPda}. Original error: ${err}`)
    }
  }

  return { bucketPda, signature }
}

/* ------------------------------------------------------------------ */
/*  Add Presale Bucket                                                 */
/* ------------------------------------------------------------------ */

export async function addPresaleBucket(
  umi: Umi,
  signer: Signer,
  payer: Signer | undefined,
  genesisAccount: PublicKey,
  baseMint: PublicKey,
  quoteMint: PublicKey,
  params: AddPresaleParams,
): Promise<{ bucketPda: PublicKey; signature: string }> {
  const depositStartCondition = makeCondition(params.depositStart)
  const depositEndCondition = makeCondition(params.depositEnd)
  const claimStartCondition = makeCondition(params.claimStart)
  const claimEndCondition = makeCondition(params.claimEnd)

  const transaction = addPresaleBucketV2(umi, {
    genesisAccount,
    baseMint,
    quoteMint,
    authority: signer,
    payer,
    bucketIndex: params.bucketIndex,
    baseTokenAllocation: BigInt(params.allocation),
    allocationQuoteTokenCap: BigInt(params.quoteCap),
    depositStartCondition,
    depositEndCondition,
    claimStartCondition,
    claimEndCondition,
    backendSigner: none(),
    depositLimit: params.depositLimit
      ? some({ limit: BigInt(params.depositLimit) })
      : none(),
    allowlist: none(),
    claimSchedule: none(),
    minimumDepositAmount: params.minimumDeposit
      ? some({ amount: BigInt(params.minimumDeposit) })
      : none(),
    endBehaviors: [],
    depositCooldown: none(),
    perCooldownDepositLimit: none(),
    steppedDepositLimit: none(),
  })

  const result = await umiSendAndConfirmTransaction(umi, transaction)

  const [bucketPda] = findPresaleBucketV2Pda(umi, {
    genesisAccount,
    bucketIndex: params.bucketIndex,
  })

  const signature = txSignatureToString(result.transaction.signature as Uint8Array)
  return { bucketPda, signature }
}

/* ------------------------------------------------------------------ */
/*  Add Unlocked Bucket                                                */
/* ------------------------------------------------------------------ */

export async function addUnlockedBucket(
  umi: Umi,
  signer: Signer,
  payer: Signer | undefined,
  genesisAccount: PublicKey,
  baseMint: PublicKey,
  quoteMint: PublicKey,
  params: AddUnlockedParams,
): Promise<{ bucketPda: PublicKey; signature: string }> {
  const claimStartCondition = makeCondition(params.claimStart)
  const claimEndCondition = makeCondition(params.claimEnd)

  const transaction = addUnlockedBucketV2(umi, {
    genesisAccount,
    baseMint,
    quoteMint,
    authority: signer,
    payer,
    recipient: publicKey(params.recipient),
    bucketIndex: params.bucketIndex,
    baseTokenAllocation: BigInt(params.allocation),
    claimStartCondition,
    claimEndCondition,
    backendSigner: none(),
  })

  const result = await umiSendAndConfirmTransaction(umi, transaction)

  const [bucketPda] = findUnlockedBucketV2Pda(umi, {
    genesisAccount,
    bucketIndex: params.bucketIndex,
  })

  const signature = txSignatureToString(result.transaction.signature as Uint8Array)
  return { bucketPda, signature }
}

/* ------------------------------------------------------------------ */
/*  Finalize Genesis                                                   */
/* ------------------------------------------------------------------ */

export async function finalizeGenesis(
  umi: Umi,
  signer: Signer,
  genesisAccount: PublicKey,
  baseMint: PublicKey,
  bucketCount: number,
): Promise<string> {
  const pdaFinders = [
    findLaunchPoolBucketV2Pda,
    findPresaleBucketV2Pda,
    findUnlockedBucketV2Pda,
  ]

  // Build all PDA lookups and fetch in parallel
  const pdaLookups: { pda: PublicKey }[] = []
  for (let i = 0; i < bucketCount; i++) {
    for (const finder of pdaFinders) {
      const [pda] = finder(umi, {
        genesisAccount,
        bucketIndex: i,
      })
      pdaLookups.push({ pda })
    }
  }

  const accounts = await Promise.all(
    pdaLookups.map(({ pda }) => umi.rpc.getAccount(pda))
  )

  const bucketAccounts: AccountMeta[] = accounts
    .map((account, idx) => ({ account, pda: pdaLookups[idx].pda }))
    .filter(({ account }) => account.exists)
    .map(({ pda }) => ({
      pubkey: pda,
      isSigner: false,
      isWritable: true,
    }))

  const transaction = finalizeV2(umi, {
    genesisAccount,
    baseMint,
    authority: signer,
  }).addRemainingAccounts(bucketAccounts)

  const result = await umiSendAndConfirmTransaction(umi, transaction)
  return txSignatureToString(result.transaction.signature as Uint8Array)
}
