import {
  swapBondingCurveV2,
  safeFetchGenesisAccountV2,
  findBondingCurveBucketV2Pda,
  safeFetchBondingCurveBucketV2,
  SwapDirection,
  getSwapResult,
  applySlippage,
  isFirstBuyPending,
  isSwappable,
  isSoldOut,
  getCurrentPrice,
  getCurrentPriceQuotePerBase,
  getFillPercentage,
} from '@metaplex-foundation/genesis'
import { publicKey } from '@metaplex-foundation/umi'
import { Args, Flags } from '@oclif/core'
import ora from 'ora'

import { TransactionCommand } from '../../TransactionCommand.js'
import { generateExplorerUrl } from '../../explorers.js'
import { txSignatureToString } from '../../lib/util.js'
import umiSendAndConfirmTransaction from '../../lib/umi/sendAndConfirm.js'

export default class GenesisSwap extends TransactionCommand<typeof GenesisSwap> {
  static override description = `Swap on a Genesis bonding curve.

Buy tokens with quote tokens (e.g. SOL) or sell tokens back for quote tokens.
The bonding curve uses a constant-product formula for pricing.

Use --direction buy to purchase tokens (amount is in quote token base units, e.g. lamports).
Use --direction sell to sell tokens (amount is in base token base units).

Use --info to display curve status and price quotes without executing a swap.`

  static override examples = [
    '$ mplx genesis swap GenesisAddress... --direction buy --amount 100000000',
    '$ mplx genesis swap GenesisAddress... --direction sell --amount 500000000000',
    '$ mplx genesis swap GenesisAddress... --direction buy --amount 100000000 --slippage 300',
    '$ mplx genesis swap GenesisAddress... --info',
    '$ mplx genesis swap GenesisAddress... --info --quoteAmount 100000000',
  ]

  static override usage = 'genesis swap [GENESIS] [FLAGS]'

  static override args = {
    genesis: Args.string({
      description: 'The Genesis account address',
      required: true,
    }),
  }

  static override flags = {
    direction: Flags.option({
      char: 'd',
      description: 'Swap direction: buy (quote → base tokens) or sell (base tokens → quote)',
      options: ['buy', 'sell'] as const,
      required: false,
    })(),
    amount: Flags.string({
      char: 'a',
      description: 'Amount to swap (in base units)',
      required: false,
    }),
    slippage: Flags.integer({
      description: 'Slippage tolerance in basis points (default: 200 = 2%)',
      default: 200,
    }),
    bucketIndex: Flags.integer({
      char: 'b',
      description: 'Index of the bonding curve bucket (default: 0)',
      default: 0,
    }),
    info: Flags.boolean({
      description: 'Display curve status, price info, and optional quotes without swapping',
      default: false,
    }),
    quoteAmount: Flags.string({
      description: '[--info only] Get a buy quote for this quote token amount (base units)',
      required: false,
    }),
    sellAmount: Flags.string({
      description: '[--info only] Get a sell quote for this base token amount (base units)',
      required: false,
    }),
  }

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(GenesisSwap)

    if (flags.info) {
      return this.showCurveInfo(args.genesis, flags)
    }

    // Validate required flags for swap
    if (!flags.direction) {
      this.error('--direction is required for swaps. Use --info to view curve status without swapping.')
    }
    if (!flags.amount) {
      this.error('--amount is required for swaps. Use --info to view curve status without swapping.')
    }

    const spinner = ora('Processing swap...').start()

    try {
      const genesisAddress = publicKey(args.genesis)

      // Fetch genesis account
      spinner.text = 'Fetching Genesis account...'
      const genesisAccount = await safeFetchGenesisAccountV2(this.context.umi, genesisAddress)
      if (!genesisAccount) {
        spinner.fail('Genesis account not found')
        this.error(`Genesis account not found at address: ${args.genesis}`)
      }

      // Fetch bonding curve bucket
      const [bucketPda] = findBondingCurveBucketV2Pda(this.context.umi, {
        genesisAccount: genesisAddress,
        bucketIndex: flags.bucketIndex,
      })

      spinner.text = 'Fetching bonding curve bucket...'
      const bucket = await safeFetchBondingCurveBucketV2(this.context.umi, bucketPda)
      if (!bucket) {
        spinner.fail('Bonding curve bucket not found')
        this.error(`Bonding curve bucket not found at index ${flags.bucketIndex}.`)
      }

      // Parse amount
      let amount: bigint
      try {
        amount = BigInt(flags.amount)
      } catch {
        this.error(`Invalid amount "${flags.amount}". Must be a non-negative integer.`)
      }
      if (amount <= 0n) {
        this.error('Swap amount must be greater than 0.')
      }

      const swapDirection = flags.direction === 'buy' ? SwapDirection.Buy : SwapDirection.Sell
      const firstBuy = isFirstBuyPending(bucket)

      // Get quote
      const quote = getSwapResult(bucket, amount, swapDirection, firstBuy)
      const minAmountOut = applySlippage(quote.amountOut, flags.slippage)

      spinner.text = `Swapping ${flags.direction === 'buy' ? 'quote → base' : 'base → quote'} tokens...`

      const transaction = swapBondingCurveV2(this.context.umi, {
        genesisAccount: genesisAddress,
        bucket: bucketPda,
        baseMint: genesisAccount.baseMint,
        quoteMint: genesisAccount.quoteMint,
        payer: this.context.payer,
        swapDirection,
        amount,
        minAmountOutScaled: minAmountOut,
      })

      const result = await umiSendAndConfirmTransaction(this.context.umi, transaction)

      spinner.succeed('Swap successful!')

      const sig = txSignatureToString(result.transaction.signature as Uint8Array)

      this.log('')
      this.logSuccess(`${flags.direction === 'buy' ? 'Bought' : 'Sold'} tokens on bonding curve`)
      this.log('')
      this.log('Swap Details:')
      this.log(`  Genesis Account: ${genesisAddress}`)
      this.log(`  Bucket: ${bucketPda}`)
      this.log(`  Direction: ${flags.direction}`)
      this.log(`  Amount In: ${amount.toString()}`)
      this.log(`  Expected Out: ${quote.amountOut.toString()}`)
      this.log(`  Min Out (with ${flags.slippage}bps slippage): ${minAmountOut.toString()}`)
      this.log(`  Fee: ${quote.fee.toString()}`)
      this.log(`  Creator Fee: ${quote.creatorFee.toString()}`)
      this.log('')
      this.log(`Transaction: ${sig}`)
      this.log(generateExplorerUrl(this.context.explorer, this.context.chain, sig, 'transaction'))

      return {
        genesisAccount: genesisAddress.toString(),
        bucket: bucketPda.toString(),
        direction: flags.direction,
        amountIn: amount.toString(),
        expectedOut: quote.amountOut.toString(),
        minOut: minAmountOut.toString(),
        fee: quote.fee.toString(),
        creatorFee: quote.creatorFee.toString(),
        signature: sig,
        explorer: generateExplorerUrl(this.context.explorer, this.context.chain, sig, 'transaction'),
      }
    } catch (error) {
      spinner.fail('Failed to swap')
      throw error
    }
  }

  private async showCurveInfo(genesisArg: string, flags: Record<string, unknown>): Promise<unknown> {
    const spinner = ora('Fetching curve info...').start()

    try {
      const genesisAddress = publicKey(genesisArg)
      const bucketIndex = (flags.bucketIndex as number) ?? 0

      const genesisAccount = await safeFetchGenesisAccountV2(this.context.umi, genesisAddress)
      if (!genesisAccount) {
        spinner.fail('Genesis account not found')
        this.error(`Genesis account not found at address: ${genesisArg}`)
      }

      const [bucketPda] = findBondingCurveBucketV2Pda(this.context.umi, {
        genesisAccount: genesisAddress,
        bucketIndex,
      })

      const bucket = await safeFetchBondingCurveBucketV2(this.context.umi, bucketPda)
      if (!bucket) {
        spinner.fail('Bonding curve bucket not found')
        this.error(`Bonding curve bucket not found at index ${bucketIndex}.`)
      }

      spinner.succeed('Curve info fetched!')

      const price = getCurrentPrice(bucket)
      const priceQpB = getCurrentPriceQuotePerBase(bucket)
      const firstBuy = isFirstBuyPending(bucket)
      const swappable = isSwappable(bucket)
      const soldOut = isSoldOut(bucket)
      const fillPct = getFillPercentage(bucket)

      this.log('')
      this.logSuccess('Bonding Curve Info')
      this.log('')
      this.log('Pricing:')
      this.log(`  Tokens per quote unit: ${price.toString()}`)
      this.log(`  Quote per token: ${priceQpB.toString()}`)
      this.log('')
      this.log('Reserves:')
      this.log(`  Base Token Balance: ${bucket.bucket.baseTokenBalance.toString()}`)
      this.log(`  Base Token Allocation: ${bucket.bucket.baseTokenAllocation.toString()}`)
      this.log(`  Quote Token Total: ${bucket.quoteTokenDepositTotal.toString()}`)
      this.log(`  Virtual SOL: ${bucket.constantProductParams.virtualSol.toString()}`)
      this.log(`  Virtual Tokens: ${bucket.constantProductParams.virtualTokens.toString()}`)
      this.log('')
      this.log('Status:')
      this.log(`  First Buy Pending: ${firstBuy ? 'Yes' : 'No'}`)
      this.log(`  Swappable: ${swappable ? 'Yes' : 'No'}`)
      this.log(`  Sold Out: ${soldOut ? 'Yes' : 'No'}`)
      this.log(`  Fill: ${fillPct.toFixed(2)}%`)

      const result: Record<string, unknown> = {
        genesisAccount: genesisAddress.toString(),
        bucket: bucketPda.toString(),
        price: price.toString(),
        priceQuotePerBase: priceQpB.toString(),
        firstBuyPending: firstBuy,
        swappable,
        soldOut,
        fillPercentage: fillPct,
      }

      // Buy quote
      if (typeof flags.quoteAmount === 'string') {
        const quoteAmt = BigInt(flags.quoteAmount)
        const buyQuote = getSwapResult(bucket, quoteAmt, SwapDirection.Buy, firstBuy)
        const minOut = applySlippage(buyQuote.amountOut, (flags.slippage as number) ?? 200)
        this.log('')
        this.log(`Buy Quote (${quoteAmt.toString()} quote tokens in):`)
        this.log(`  Tokens out: ${buyQuote.amountOut.toString()}`)
        this.log(`  Fee: ${buyQuote.fee.toString()}`)
        this.log(`  Creator Fee: ${buyQuote.creatorFee.toString()}`)
        this.log(`  Min out (${flags.slippage}bps slippage): ${minOut.toString()}`)
        result.buyQuote = {
          amountIn: quoteAmt.toString(),
          amountOut: buyQuote.amountOut.toString(),
          fee: buyQuote.fee.toString(),
          creatorFee: buyQuote.creatorFee.toString(),
          minOut: minOut.toString(),
        }
      }

      // Sell quote
      if (typeof flags.sellAmount === 'string') {
        const sellAmt = BigInt(flags.sellAmount)
        const sellQuote = getSwapResult(bucket, sellAmt, SwapDirection.Sell, false)
        const minOut = applySlippage(sellQuote.amountOut, (flags.slippage as number) ?? 200)
        this.log('')
        this.log(`Sell Quote (${sellAmt.toString()} base tokens in):`)
        this.log(`  Quote tokens out: ${sellQuote.amountOut.toString()}`)
        this.log(`  Fee: ${sellQuote.fee.toString()}`)
        this.log(`  Creator Fee: ${sellQuote.creatorFee.toString()}`)
        this.log(`  Min out (${flags.slippage}bps slippage): ${minOut.toString()}`)
        result.sellQuote = {
          amountIn: sellAmt.toString(),
          amountOut: sellQuote.amountOut.toString(),
          fee: sellQuote.fee.toString(),
          creatorFee: sellQuote.creatorFee.toString(),
          minOut: minOut.toString(),
        }
      }

      return result
    } catch (error) {
      spinner.fail('Failed to fetch curve info')
      throw error
    }
  }
}
