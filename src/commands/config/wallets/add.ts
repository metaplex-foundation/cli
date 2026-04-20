import { Args, Command, Flags } from '@oclif/core'
import fs from 'fs'
import { dirname } from 'path'
import { fetchAsset, findAssetSignerPda } from '@metaplex-foundation/mpl-core'
import { publicKey } from '@metaplex-foundation/umi'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { mplCore } from '@metaplex-foundation/mpl-core'
import { createSignerFromPath, consolidateConfigs, DEFAULT_CONFIG, getDefaultConfigPath, readConfig, WalletEntry } from '../../../lib/Context.js'
import { ensureDirectoryExists, writeJsonSync } from '../../../lib/file.js'
import { shortenAddress, DUMMY_UMI } from '../../../lib/util.js'

export default class ConfigWalletAddCommand extends Command {
  static enableJsonFlag = true

  static override description = 'Add a new wallet to your configuration. Use --asset for a generic Core asset-signer wallet, or --agent for an agent wallet.'

  static override args = {
    name: Args.string({
      description: 'Name of wallet (alphanumeric, hyphens and underscores only)',
      required: true,
    }),
    path: Args.string({ description: 'Path to keypair json file (not required for --asset or --agent)', required: false }),
  }

  static override flags = {
    asset: Flags.string({
      description: 'Core asset address to create an asset-signer wallet from',
    }),
    agent: Flags.string({
      description: 'Agent mint address (Core asset) to create an agent wallet from',
    }),
  }

  static override examples = [
    '<%= config.bin %> <%= command.id %> my-wallet ~/.config/solana/id.json',
    '<%= config.bin %> <%= command.id %> mainnet-wallet ./wallets/mainnet.json',
    '<%= config.bin %> <%= command.id %> vault --asset <assetId>',
    '<%= config.bin %> <%= command.id %> my-agent --agent <agentMint>',
  ]

  public async run(): Promise<unknown> {
    const { flags, args } = await this.parse(ConfigWalletAddCommand)

    // Validate name contains only safe characters for all platforms
    if (!/^[a-zA-Z0-9-_]+$/.test(args.name)) {
      this.error(`Invalid wallet name '${args.name}'. Name must contain only letters, numbers, hyphens (-), and underscores (_). Example: 'my-wallet' or 'dev_wallet_1'`)
    }

    const configPath = flags.config ?? getDefaultConfigPath()
    const config = readConfig(configPath)

    if (!config.wallets) {
      config.wallets = []
    }

    // Check for duplicate name
    const existingName = config.wallets.find((wallet) => wallet.name === args.name)
    if (existingName) {
      this.error(`A wallet named '${args.name}' already exists.\nUse a different name or run 'mplx config wallets remove ${args.name}' to remove the existing wallet first.`)
    }

    let wallet: WalletEntry

    if (flags.agent) {
      // Agent wallet — derives the signer PDA from the agent's Core asset mint
      const agentMintPubkey = publicKey(flags.agent)
      const [pdaPubkey] = findAssetSignerPda(DUMMY_UMI, { asset: agentMintPubkey })

      const mergedConfig = consolidateConfigs(DEFAULT_CONFIG, config, { rpcUrl: flags.rpc })
      const umi = createUmi(mergedConfig.rpcUrl!).use(mplCore())
      const asset = await fetchAsset(umi, agentMintPubkey).catch(() => {
        this.error(`Could not fetch agent asset ${flags.agent}. Make sure it exists and your RPC is reachable.`)
      })

      const ownerAddress = asset.owner.toString()

      const ownerWallet = config.wallets.find(
        w => w.address === ownerAddress && w.type !== 'asset-signer' && w.type !== 'agent'
      )

      if (!ownerWallet) {
        this.error(
          `Agent owner ${shortenAddress(ownerAddress)} is not in your saved wallets.\n` +
          `Add the owner wallet first: mplx config wallets add <name> <keypair-path>`
        )
      }

      const existingAddress = config.wallets.find((w) => w.address === pdaPubkey.toString())
      if (existingAddress) {
        this.error(`This agent's wallet PDA (${shortenAddress(pdaPubkey)}) is already configured as '${existingAddress.name}'.`)
      }

      wallet = {
        name: args.name,
        type: 'agent',
        asset: flags.agent,
        address: pdaPubkey.toString(),
        payer: ownerWallet.name,
      }

      config.wallets.push(wallet)

      const dir = dirname(configPath)
      ensureDirectoryExists(dir)
      writeJsonSync(configPath, config)

      this.log(
        `✅ Agent wallet '${args.name}' added!\n` +
        `   Agent Mint:   ${flags.agent}\n` +
        `   Agent Wallet: ${pdaPubkey.toString()}\n` +
        `   Owner:        ${ownerWallet.name} (${shortenAddress(ownerAddress)})\n` +
        `\nUse 'mplx config wallets set ${args.name}' to make this your active wallet.`
      )

      return {
        name: args.name,
        type: 'agent',
        agentMint: flags.agent,
        agentWallet: pdaPubkey.toString(),
        owner: ownerWallet.name,
      }
    }

    if (flags.asset) {
      // Asset-signer wallet
      const assetPubkey = publicKey(flags.asset)
      const [pdaPubkey] = findAssetSignerPda(DUMMY_UMI, { asset: assetPubkey })

      // Fetch the asset on-chain to determine the owner
      const mergedConfig = consolidateConfigs(DEFAULT_CONFIG, config, { rpcUrl: flags.rpc })
      const umi = createUmi(mergedConfig.rpcUrl!).use(mplCore())
      const asset = await fetchAsset(umi, assetPubkey).catch(() => {
        this.error(`Could not fetch asset ${flags.asset}. Make sure it exists and your RPC is reachable.`)
      })

      const ownerAddress = asset.owner.toString()

      // Find the saved wallet that matches the asset owner
      const ownerWallet = config.wallets.find(
        w => w.address === ownerAddress && w.type !== 'asset-signer'
      )

      if (!ownerWallet) {
        this.error(
          `Asset owner ${shortenAddress(ownerAddress)} is not in your saved wallets.\n` +
          `Add the owner wallet first: mplx config wallets add <name> <keypair-path>`
        )
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
        payer: ownerWallet.name,
      }

      config.wallets.push(wallet)

      const dir = dirname(configPath)
      ensureDirectoryExists(dir)
      writeJsonSync(configPath, config)

      this.log(
        `✅ Asset-signer wallet '${args.name}' added!\n` +
        `   Asset:      ${flags.asset}\n` +
        `   Signer PDA: ${pdaPubkey.toString()}\n` +
        `   Owner:      ${ownerWallet.name} (${shortenAddress(ownerAddress)})\n` +
        `\nUse 'mplx config wallets set ${args.name}' to make this your active wallet.`
      )

      return {
        name: args.name,
        type: 'asset-signer',
        asset: flags.asset,
        address: pdaPubkey.toString(),
        owner: ownerWallet.name,
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

    const dir = dirname(configPath)
    ensureDirectoryExists(dir)
    writeJsonSync(configPath, config)

    this.log(`✅ Wallet '${args.name}' successfully added to configuration!\n   Address: ${signer.publicKey}\n   Path: ${args.path}\n\nUse 'mplx config wallets set ${args.name}' to make this your active wallet.`)

    return {
      name: args.name,
      address: signer.publicKey.toString(),
      path: args.path,
    }
  }
}
