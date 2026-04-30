import {
  BondingCurveBucketV2,
  claimCreatorRewards,
  GenesisApiConfig,
  getBondingCurveBucketV2GpaBuilder,
  getRaydiumCpmmBucketV2GpaBuilder,
  isGenesisApiError,
  Key,
  RaydiumCpmmBucketV2,
  SvmNetwork,
} from '@metaplex-foundation/genesis'
import { isPublicKey, PublicKey, publicKey, Umi, unwrapOptionRecursively } from '@metaplex-foundation/umi'
import { base58 } from '@metaplex-foundation/umi/serializers'
import { Flags } from '@oclif/core'
import ora from 'ora'

import { TransactionCommand } from '../../TransactionCommand.js'
import { generateExplorerUrl } from '../../explorers.js'
import { getDefaultApiUrl } from '../../lib/genesis/launchApi.js'
import { detectSvmNetwork } from '../../lib/util.js'

const NO_REWARDS_MESSAGE = 'No rewards available to claim'

// extensions @ 488 + reserved(8) + backendSigner(32) + firstBuy(40) + firstBuyDone(1) + paddingAlign(7) = +88.
const BC_CREATOR_FEE_WALLET_OFFSET = 488 + 88
// extensions @ 576 + reserved(8) + backendSigner(32) + lpLockSchedule option (272) = +312.
const RAYDIUM_CREATOR_FEE_WALLET_OFFSET = 576 + 312

const WSOL_MINT = 'So11111111111111111111111111111111111111112'

interface ClaimablePreview {
  address: string
  pending: bigint
  quoteMint: string
  type: 'Bonding Curve' | 'Raydium CPMM'
}

export default class GenesisClaimCreatorRewards extends TransactionCommand<typeof GenesisClaimCreatorRewards> {
  static override description = `Claim accrued creator rewards across all Genesis bonding-curve and Raydium buckets.

Calls the Metaplex Genesis API to discover every bucket where the wallet is the
creator fee recipient — across bonding-curve launches and the Raydium CPMM pools
that bonding-curves and launchpools graduate to — and submits one transaction
per claimable bucket. The configured signer always pays transaction fees; the
creator fee wallet receives the claimed rewards.

Returns a friendly message when there is nothing to claim.`

  static override examples = [
    '$ mplx genesis claim-creator-rewards',
    '$ mplx genesis claim-creator-rewards --wallet <CREATOR_FEE_WALLET>',
    '$ mplx genesis claim-creator-rewards --network solana-devnet',
    '$ mplx genesis claim-creator-rewards --apiUrl https://api.metaplex.dev',
  ]

  static override flags = {
    apiUrl: Flags.string({
      description: 'Genesis API base URL (defaults to https://api.metaplex.com for mainnet, https://api.metaplex.dev for devnet)',
      required: false,
    }),
    network: Flags.option({
      description: 'Network override (auto-detected from RPC if not set)',
      options: ['solana-mainnet', 'solana-devnet'] as const,
      required: false,
    })(),
    wallet: Flags.string({
      char: 'w',
      description: 'Creator fee wallet to claim for. The signer always pays fees; rewards go to this wallet. Defaults to the configured signer.',
      required: false,
    }),
  }

  static override usage = 'genesis claim-creator-rewards [FLAGS]'

  public async run(): Promise<unknown> {
    const { flags } = await this.parse(GenesisClaimCreatorRewards)

    if (flags.wallet && !isPublicKey(flags.wallet)) {
      this.error('--wallet must be a valid public key')
    }

    const wallet: PublicKey = flags.wallet ? publicKey(flags.wallet) : this.context.umi.identity.publicKey
    const network: SvmNetwork = flags.network ?? detectSvmNetwork(this.context.chain)
    const apiConfig: GenesisApiConfig = {
      baseUrl: flags.apiUrl ?? getDefaultApiUrl(network),
    }

    const spinner = ora('Looking up creator rewards...').start()

    const claimable = await this.fetchClaimablePreview(this.context.umi, wallet)

    if (claimable.length === 0) {
      spinner.info(`No rewards to claim for ${wallet}`)
      return { claimed: 0, wallet: wallet.toString() }
    }

    spinner.stop()
    this.printPreview(wallet, claimable)

    spinner.start('Building transactions via Genesis API...')

    let result
    try {
      result = await claimCreatorRewards(this.context.umi, apiConfig, {
        network,
        payer: this.context.umi.identity.publicKey,
        wallet,
      })
    } catch (error) {
      if (isGenesisApiError(error) && error.message === NO_REWARDS_MESSAGE) {
        spinner.info(`No rewards to claim for ${wallet}`)
        return { claimed: 0, wallet: wallet.toString() }
      }

      spinner.fail('Failed to fetch creator rewards from Genesis API')
      throw error
    }

    if (result.transactions.length === 0) {
      spinner.info(`No rewards to claim for ${wallet}`)
      return { claimed: 0, wallet: wallet.toString() }
    }

    const allowedCommitments = ['processed', 'confirmed', 'finalized'] as const
    const commitment = allowedCommitments.includes(this.context.commitment as typeof allowedCommitments[number])
      ? (this.context.commitment as typeof allowedCommitments[number])
      : 'confirmed'

    const results: { explorer: string; signature: string }[] = []
    for (const [index, tx] of result.transactions.entries()) {
      spinner.text = `Sending transaction ${index + 1} of ${result.transactions.length}...`
      const signed = await this.context.umi.identity.signTransaction(tx)
      const signatureBytes = await this.context.umi.rpc.sendTransaction(signed, {
        commitment,
        preflightCommitment: commitment,
      })
      await this.context.umi.rpc.confirmTransaction(signatureBytes, {
        commitment,
        strategy: { type: 'blockhash', ...result.blockhash },
      })

      const signature = base58.deserialize(signatureBytes)[0]
      results.push({
        explorer: generateExplorerUrl(this.context.explorer, this.context.chain, signature, 'transaction'),
        signature,
      })
    }

    spinner.succeed(`Claimed creator rewards across ${results.length} bucket${results.length === 1 ? '' : 's'}`)

    this.log('')
    this.logSuccess(`Creator rewards claimed for ${wallet}`)
    this.log('')
    this.log('Transactions:')
    for (const { explorer, signature } of results) {
      this.log(`  ${signature}`)
      this.log(`  ${explorer}`)
    }

    return {
      buckets: claimable.map((b) => ({
        address: b.address,
        pending: b.pending.toString(),
        quoteMint: b.quoteMint,
        type: b.type,
      })),
      signatures: results,
      wallet: wallet.toString(),
    }
  }

  private async fetchClaimablePreview(umi: Umi, wallet: PublicKey): Promise<ClaimablePreview[]> {
    const [bcBuckets, raydiumBuckets] = await Promise.all([
      getBondingCurveBucketV2GpaBuilder(umi)
        .whereField('key', Key.BondingCurveBucketV2)
        .where(BC_CREATOR_FEE_WALLET_OFFSET, wallet)
        .getDeserialized(),
      getRaydiumCpmmBucketV2GpaBuilder(umi)
        .whereField('key', Key.RaydiumCpmmBucketV2)
        .where(RAYDIUM_CREATOR_FEE_WALLET_OFFSET, wallet)
        .getDeserialized(),
    ])

    const previews: ClaimablePreview[] = []

    for (const bucket of bcBuckets) {
      const pending = bucket.creatorFeeAccrued - bucket.creatorFeeClaimed
      if (pending <= 0n) continue
      previews.push({
        address: bucket.publicKey.toString(),
        pending,
        quoteMint: getQuoteMint(bucket),
        type: 'Bonding Curve',
      })
    }

    for (const bucket of raydiumBuckets) {
      // Raydium claim is special: the LP may have uncollected fees that the
      // claim transaction collects first. We can't preview those without
      // loading the pool state, so we display only the bucket-tracked accrued.
      const pending = bucket.creatorFeeAccrued - bucket.creatorFeeClaimed
      if (pending <= 0n) continue
      previews.push({
        address: bucket.publicKey.toString(),
        pending,
        quoteMint: getQuoteMint(bucket),
        type: 'Raydium CPMM',
      })
    }

    return previews
  }

  private printPreview(wallet: PublicKey, claimable: ClaimablePreview[]): void {
    this.log('')
    this.log(`Claimable creator rewards for ${wallet}:`)
    for (const item of claimable) {
      this.log(`  ${item.type.padEnd(13)} ${item.address}  pending: ${formatAmount(item.pending, item.quoteMint)}`)
    }

    const totalsByQuote = new Map<string, bigint>()
    for (const item of claimable) {
      totalsByQuote.set(item.quoteMint, (totalsByQuote.get(item.quoteMint) ?? 0n) + item.pending)
    }

    if (claimable.length > 1 || totalsByQuote.size > 1) {
      this.log('')
      this.log('Total pending:')
      for (const [quoteMint, total] of totalsByQuote) {
        this.log(`  ${formatAmount(total, quoteMint)}`)
      }
    }

    this.log('')
  }
}

function getQuoteMint(bucket: BondingCurveBucketV2 | RaydiumCpmmBucketV2): string {
  const quoteMint = unwrapOptionRecursively(bucket.bucket.quoteMint)
  return quoteMint?.toString() ?? '<missing>'
}

function formatAmount(amount: bigint, quoteMint: string): string {
  if (quoteMint === WSOL_MINT) {
    return `${formatLamports(amount)} SOL`
  }

  return `${amount.toString()} (quote: ${quoteMint})`
}

function formatLamports(lamports: bigint): string {
  const negative = lamports < 0n
  const abs = negative ? -lamports : lamports
  const whole = abs / 1_000_000_000n
  const frac = (abs % 1_000_000_000n).toString().padStart(9, '0').replace(/0+$/, '')
  return `${negative ? '-' : ''}${whole}${frac ? `.${frac}` : ''}`
}
