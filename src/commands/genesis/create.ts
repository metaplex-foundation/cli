import {
  initializeV2,
  findGenesisAccountV2Pda,
  WRAPPED_SOL_MINT,
} from '@metaplex-foundation/genesis'
import { generateSigner, publicKey } from '@metaplex-foundation/umi'
import { Flags } from '@oclif/core'
import ora from 'ora'

import { TransactionCommand } from '../../TransactionCommand.js'
import { generateExplorerUrl } from '../../explorers.js'
import { txSignatureToString } from '../../lib/util.js'
import umiSendAndConfirmTransaction from '../../lib/umi/sendAndConfirm.js'

// Funding modes for Genesis
const FUNDING_MODE = {
  NewMint: 0,    // Create a new mint (most common)
  Transfer: 1,   // Transfer existing tokens
} as const

export default class GenesisCreate extends TransactionCommand<typeof GenesisCreate> {
  static override description = `Create a new Genesis account for a token launch (TGE).

Genesis is a smart contract framework for Token Generation Events on Solana.
This command initializes a new Genesis account that will coordinate your token launch.

The Genesis account manages:
- Token supply and allocation
- Launch pools, auctions, and presales
- Integration with DEXs (Raydium, Meteora)

Funding Modes:
- new-mint: Creates a new token mint (default, most common)
- transfer: Uses an existing mint and transfers tokens from your wallet`

  static override examples = [
    '$ mplx genesis create --name "My Token" --symbol "MTK" --totalSupply 1000000000',
    '$ mplx genesis create --name "My Token" --symbol "MTK" --totalSupply 1000000000 --uri "https://example.com/metadata.json"',
    '$ mplx genesis create --name "My Token" --symbol "MTK" --totalSupply 1000000000 --quoteMint "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" --decimals 6',
    '$ mplx genesis create --name "My Token" --symbol "MTK" --totalSupply 1000000000 --fundingMode transfer --baseMint "ExistingMint123..."',
  ]

  static override flags = {
    name: Flags.string({
      char: 'n',
      description: 'Name of the token',
      required: true,
    }),
    symbol: Flags.string({
      char: 's',
      description: 'Symbol of the token (e.g., MTK)',
      required: true,
    }),
    totalSupply: Flags.string({
      description: 'Total supply of tokens (in base units, e.g., 1000000000 for 1B tokens with 9 decimals)',
      required: true,
    }),
    uri: Flags.string({
      char: 'u',
      description: 'URI for token metadata JSON',
      default: '',
    }),
    decimals: Flags.integer({
      char: 'd',
      description: 'Number of decimals for the token',
      default: 9,
    }),
    quoteMint: Flags.string({
      description: 'Quote token mint address (default: Wrapped SOL)',
      required: false,
    }),
    fundingMode: Flags.option({
      default: 'new-mint',
      description: 'Funding mode: new-mint (create new token) or transfer (use existing)',
      options: ['new-mint', 'transfer'] as const,
    })(),
    baseMint: Flags.string({
      description: 'Base token mint address (only used with fundingMode=transfer)',
      required: false,
    }),
    genesisIndex: Flags.integer({
      description: 'Genesis index (default: 0, increment if creating multiple launches for same mint)',
      default: 0,
    }),
  }

  static override usage = 'genesis create [FLAGS]'

  public async run(): Promise<void> {
    const { flags } = await this.parse(GenesisCreate)

    const spinner = ora('Creating Genesis account...').start()

    try {
      // Determine funding mode
      const fundingMode = flags.fundingMode === 'transfer'
        ? FUNDING_MODE.Transfer
        : FUNDING_MODE.NewMint

      // Handle base mint
      let baseMint
      if (fundingMode === FUNDING_MODE.Transfer) {
        if (!flags.baseMint) {
          throw new Error('--baseMint is required when using fundingMode=transfer')
        }
        baseMint = publicKey(flags.baseMint)
      } else {
        // Generate a new mint signer for new-mint mode
        baseMint = generateSigner(this.context.umi)
      }

      // Handle quote mint (default to Wrapped SOL)
      const quoteMint = flags.quoteMint
        ? publicKey(flags.quoteMint)
        : WRAPPED_SOL_MINT

      // Parse total supply
      const totalSupply = BigInt(flags.totalSupply)

      // Build the initialize transaction
      const transaction = initializeV2(this.context.umi, {
        baseMint,
        quoteMint,
        authority: this.context.signer,
        payer: this.context.payer,
        fundingMode,
        totalSupplyBaseToken: totalSupply,
        name: flags.name,
        symbol: flags.symbol,
        uri: flags.uri,
        decimals: flags.decimals,
        genesisIndex: flags.genesisIndex,
      })

      const result = await umiSendAndConfirmTransaction(this.context.umi, transaction)

      // Get the base mint public key (either from generated signer or from flags)
      const baseMintPubkey = 'publicKey' in baseMint ? baseMint.publicKey : baseMint

      // Get the genesis account PDA
      const genesisAccountPda = findGenesisAccountV2Pda(this.context.umi, {
        baseMint: baseMintPubkey,
        genesisIndex: flags.genesisIndex,
      })

      spinner.succeed('Genesis account created successfully!')

      this.log('')
      this.logSuccess(`Genesis Account: ${genesisAccountPda}`)
      this.log(`Base Mint: ${baseMintPubkey}`)
      this.log(`Quote Mint: ${quoteMint}`)
      this.log(`Name: ${flags.name}`)
      this.log(`Symbol: ${flags.symbol}`)
      this.log(`Total Supply: ${flags.totalSupply}`)
      this.log(`Decimals: ${flags.decimals}`)
      this.log(`Funding Mode: ${flags.fundingMode}`)
      this.log('')
      this.log(`Transaction: ${txSignatureToString(result.transaction.signature as Uint8Array)}`)
      this.log('')
      this.log(
        generateExplorerUrl(
          this.context.explorer,
          this.context.chain,
          txSignatureToString(result.transaction.signature as Uint8Array),
          'transaction'
        )
      )
      this.log('')
      this.log('Next steps:')
      this.log('  1. Add buckets to your Genesis account (launch pool, auction, presale, etc.)')
      this.log('  2. Configure your launch parameters')
      this.log('  3. Finalize the launch when ready')

    } catch (error) {
      spinner.fail('Failed to create Genesis account')
      throw error
    }
  }
}
