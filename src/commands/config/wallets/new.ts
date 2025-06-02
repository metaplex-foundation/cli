import { generateSigner } from '@metaplex-foundation/umi'
import { Flags } from '@oclif/core'
import fs from 'node:fs'
import { dirname, join, normalize } from 'node:path'
import { BaseCommand } from '../../../BaseCommand.js'
import { getDefaultConfigPath, readConfig } from '../../../lib/Context.js'
import { ensureDirectoryExists, writeJsonSync } from '../../../lib/file.js'
import { shortenAddress } from '../../../lib/util.js'

/* 
  Fetch Possibilities:

  1. Fetch a single Asset by providing the Asset ID and display the metadata.

  TODO
  2. Fetch a single Asset by providing the Asset ID and download the metadata and image to disk.

  TODO
  3. Fetch multiple Assets by providing multiple Asset IDs from a .txt/.csv/json file and save metadata and image to disk (original or DAS format).
*/

export default class ConfigWalletsNew extends BaseCommand<typeof ConfigWalletsNew> {
    static description = 'Create a new wallet and optionally add it to the config file'

    static examples = [
        '<%= config.bin %> <%= command.id %>',
        '<%= config.bin %> <%= command.id %> --name my-wallet',
        '<%= config.bin %> <%= command.id %> --name my-wallet --output ./wallets',
        '<%= config.bin %> <%= command.id %> --name my-wallet --hidden',
    ]

    static flags = {
        output: Flags.string({
            description: 'Directory path where to save the wallet file',
            required: false,
        }),
        hidden: Flags.boolean({
            description: 'Save wallet in the hidden `mplx config` folder',
            required: false,
        }),
        name: Flags.string({ 
            name: 'name', 
            description: 'Name for wallet (max 6 characters, alphanumeric, hyphens and underscores only). If provided, the wallet will be added to the config file',
            required: false,
        }),
    }

    static args = {}

    public async run() {
        const { flags } = await this.parse(ConfigWalletsNew)
        const { umi } = this.context

        // Validate name if provided
        if (flags.name) {
            if (flags.name.length > 6) {
                this.error('Name must be 6 characters or less')
            }

            // Validate name contains only safe characters for all platforms
            // TODO: Move validation to validations file that is in other PR
            if (!/^[a-zA-Z0-9-_]+$/.test(flags.name)) {
                this.error('Name must contain only alphanumeric characters, hyphens and underscores')
            }
        }

        // Determine save path
        const savePath = flags.hidden 
            ? dirname(getDefaultConfigPath())
            : normalize(flags.output ?? process.cwd())

        if (!fs.existsSync(savePath)) {
            fs.mkdirSync(savePath, { recursive: true })
        }

        // Generate new wallet
        const wallet = generateSigner(umi)
        const walletJson = JSON.stringify(Array.from(wallet.secretKey))

        // Create filename with sanitized name if provided
        const fileName = flags.name 
            ? `${flags.name}-${wallet.publicKey}.json`
            : `${wallet.publicKey}.json`

        // Save wallet file
        const filePath = join(savePath, fileName)
        fs.writeFileSync(filePath, walletJson)
        console.log(`Wallet saved to: ${filePath}`)

        // Add to config if name provided
        if (flags.name) {
            const configPath = flags.config ?? getDefaultConfigPath()
            const config = readConfig(configPath)
            
            if (!config.wallets) {
                config.wallets = []
            }

            // Check for existing wallet with same name
            const existingName = config.wallets.find((w) => w.name === flags.name)
            if (existingName) {
                this.error(`Wallet with name ${flags.name} already exists`)
            }

            // Check for existing wallet with same path
            const existingPath = config.wallets.find((w) => w.path === filePath)
            if (existingPath) {
                this.error(`Wallet with path ${filePath} already exists`)
            }

            // Check for existing wallet with same address
            const existingAddress = config.wallets.find((w) => w.address === wallet.publicKey.toString())
            if (existingAddress) {
                this.error(`Wallet with address ${shortenAddress(wallet.publicKey)} already exists`)
            }

            const newWallet = {
                name: flags.name,
                path: filePath,
                address: wallet.publicKey.toString(),
            }

            config.wallets.push(newWallet)

            // Ensure config directory exists and save config
            const configDir = dirname(configPath)
            ensureDirectoryExists(configDir)
            writeJsonSync(configPath, config)

            console.log(`Wallet ${shortenAddress(wallet.publicKey)} added to config.`)
        }
    }
}
