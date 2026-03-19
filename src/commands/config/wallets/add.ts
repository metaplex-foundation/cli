import { Args, Command, Flags } from '@oclif/core'
import fs from 'fs'
import { dirname } from 'path'
import { findAssetSignerPda } from '@metaplex-foundation/mpl-core'
import { publicKey } from '@metaplex-foundation/umi'
import { createSignerFromPath, getDefaultConfigPath, readConfig, WalletEntry } from '../../../lib/Context.js'
import { ensureDirectoryExists, writeJsonSync } from '../../../lib/file.js'
import { shortenAddress, DUMMY_UMI } from '../../../lib/util.js'

export default class ConfigWalletAddCommand extends Command {
  static enableJsonFlag = true

  static override description = 'Add a new wallet to your configuration. Use --asset to add an asset-signer wallet.'

  static override args = {
    name: Args.string({
      description: 'Name of wallet (alphanumeric, hyphens and underscores only)',
      required: true,
    }),
    path: Args.string({ description: 'Path to keypair json file (not required for --asset)', required: false }),
  }

  static override flags = {
    asset: Flags.string({
      description: 'Asset ID to create an asset-signer wallet from',
    }),
    payer: Flags.string({
      description: 'Default fee payer wallet name (for asset-signer wallets)',
    }),
  }

  static override examples = [
    '<%= config.bin %> <%= command.id %> my-wallet ~/.config/solana/id.json',
    '<%= config.bin %> <%= command.id %> mainnet-wallet ./wallets/mainnet.json',
    '<%= config.bin %> <%= command.id %> dev-wallet /Users/dev/.solana/devnet.json',
    '<%= config.bin %> <%= command.id %> vault --asset <assetId>',
    '<%= config.bin %> <%= command.id %> vault --asset <assetId> --payer my-wallet',
  ]

  public async run(): Promise<unknown> {
    const { flags, args } = await this.parse(ConfigWalletAddCommand)

    // Validate name contains only safe characters for all platforms
    if (!/^[a-zA-Z0-9-_]+$/.test(args.name)) {
      this.error(`Invalid wallet name '${args.name}'. Name must contain only letters, numbers, hyphens (-), and underscores (_). Example: 'my-wallet' or 'dev_wallet_1'`)
    }

    const path = flags.config ?? getDefaultConfigPath()
    const config = readConfig(path)

    if (!config.wallets) {
      config.wallets = []
    }

    // Check for duplicate name
    const existingName = config.wallets.find((wallet) => wallet.name === args.name)
    if (existingName) {
      this.error(`A wallet named '${args.name}' already exists.\nUse a different name or run 'mplx config wallets remove ${args.name}' to remove the existing wallet first.`)
    }

    let wallet: WalletEntry

    if (flags.asset) {
      // Asset-signer wallet
      const assetPubkey = publicKey(flags.asset)
      const [pdaPubkey] = findAssetSignerPda(DUMMY_UMI, { asset: assetPubkey })

      // Validate payer reference if provided
      if (flags.payer) {
        const payerWallet = config.wallets.find(w => w.name === flags.payer)
        if (!payerWallet) {
          this.error(`Payer wallet '${flags.payer}' not found. Add it first with 'mplx config wallet add'.`)
        }
        if (payerWallet.type === 'asset-signer') {
          this.error(`Payer wallet '${flags.payer}' is an asset-signer wallet. The payer must be a file or ledger wallet.`)
        }
      }

      const existingAddress = config.wallets.find((w) => w.address === pdaPubkey.toString())
      if (existingAddress) {
        this.error(`This asset's signer PDA (${shortenAddress(pdaPubkey)}) is already configured as '${existingAddress.name}'.`)
      }

      wallet = {
        name: args.name,
        type: 'asset-signer',
        asset: flags.asset,
        address: pdaPubkey.toString(),
        ...(flags.payer ? { payer: flags.payer } : {}),
      }

      config.wallets.push(wallet)

      const dir = dirname(path)
      ensureDirectoryExists(dir)
      writeJsonSync(path, config)

      this.log(
        `✅ Asset-signer wallet '${args.name}' added!\n` +
        `   Asset:      ${flags.asset}\n` +
        `   Signer PDA: ${pdaPubkey.toString()}\n` +
        (flags.payer ? `   Payer:      ${flags.payer}\n` : '') +
        `\nUse 'mplx config wallet set ${args.name}' to make this your active wallet.`
      )

      return {
        name: args.name,
        type: 'asset-signer',
        asset: flags.asset,
        address: pdaPubkey.toString(),
        payer: flags.payer,
      }
    }

    // Standard file-based wallet
    if (!args.path) {
      this.error('Path to keypair file is required for file-based wallets. Use --asset for asset-signer wallets.')
    }

    if (!args.path.endsWith('.json')) {
      this.error(`Invalid file type. Wallet file must be a .json keypair file. Received: ${args.path}`)
    }

    if (!fs.existsSync(args.path)) {
      this.error(`Wallet file not found at: ${args.path}\nPlease check the path and ensure the keypair file exists.`)
    }

    const signer = await createSignerFromPath(args.path)

    const existingPath = config.wallets.find((w) => 'path' in w && w.path === args.path)
    if (existingPath) {
      this.error(`This wallet file is already configured as '${existingPath.name}'.\nUse 'mplx config wallets set ${existingPath.name}' to switch to it.`)
    }

    const existingAddress = config.wallets.find((w) => w.address === signer.publicKey.toString())
    if (existingAddress) {
      this.error(`This wallet address (${shortenAddress(signer.publicKey)}) is already configured as '${existingAddress.name}'.\nUse 'mplx config wallets set ${existingAddress.name}' to switch to it.`)
    }

    wallet = {
      name: args.name,
      address: signer.publicKey.toString(),
      path: args.path,
    }

    config.wallets.push(wallet)

    const dir = dirname(path)
    ensureDirectoryExists(dir)
    writeJsonSync(path, config)

    this.log(`✅ Wallet '${args.name}' successfully added to configuration!\n   Address: ${signer.publicKey}\n   Path: ${args.path}\n\nUse 'mplx config wallets set ${args.name}' to make this your active wallet.`)

    return {
      name: args.name,
      address: signer.publicKey.toString(),
      path: args.path,
    }
  }
}
