import { Args, Flags } from '@oclif/core'
import {
    fetchDigitalAsset,
    fetchJsonMetadata,
    updateV1,
    updateAsUpdateAuthorityV2,
    TokenStandard,
} from '@metaplex-foundation/mpl-token-metadata'
import {
    publicKey,
    unwrapOptionRecursively,
    Umi,
} from '@metaplex-foundation/umi'
import ora from 'ora'
import mime from 'mime'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { spawnSync } from 'node:child_process'
import { TransactionCommand } from '../../TransactionCommand.js'
import { txSignatureToString } from '../../lib/util.js'
import { generateExplorerUrl } from '../../explorers.js'
import imageUploader from '../../lib/uploader/imageUploader.js'
import uploadJson from '../../lib/uploader/uploadJson.js'
import { TOKEN_AUTH_RULES_ID } from '../../constants.js'

export default class TmUpdate extends TransactionCommand<typeof TmUpdate> {
    static override description = 'Update an MPL Token Metadata NFT. Automatically detects pNFTs and includes ruleset if present. Use --editor to edit the metadata JSON in your default editor.'

    static override examples = [
        '$ mplx tm update <mintAddress> --name "New Name"',
        '$ mplx tm update <mintAddress> --name "New Name" --description "New Description" --image ./image.png',
        '$ mplx tm update <mintAddress> --uri "https://example.com/new-metadata.json"',
        '$ mplx tm update <mintAddress> --editor',
    ]

    static override usage = 'tm update [ARGS]'

    static override args = {
        mint: Args.string({ description: 'Mint address of the NFT to update', required: true }),
    }

    static override flags = {
        name: Flags.string({ description: 'New name for the NFT', exclusive: ['editor'] }),
        symbol: Flags.string({ description: 'New symbol for the NFT', exclusive: ['editor'] }),
        uri: Flags.string({
            description: 'New URI for the NFT metadata (alternative to updating individual fields)',
            exclusive: ['image', 'description', 'editor'],
        }),
        image: Flags.file({ description: 'Path to new image file', exclusive: ['uri', 'editor'] }),
        description: Flags.string({ description: 'New description for the NFT', exclusive: ['uri', 'editor'] }),
        editor: Flags.boolean({
            char: 'e',
            description: 'Open the metadata JSON in your default editor for editing',
            exclusive: ['name', 'symbol', 'uri', 'image', 'description'],
        }),
    }

    private openInEditor(filePath: string): boolean {
        // Get editor from environment or use platform-specific fallbacks
        let editor = process.env.EDITOR || process.env.VISUAL

        if (!editor) {
            // Platform-specific defaults
            const platform = process.platform
            if (platform === 'win32') {
                editor = 'notepad'
            } else if (platform === 'darwin' || platform === 'linux') {
                // Try nano first, fallback to vi
                editor = 'nano'
            } else {
                editor = 'vi'
            }
        }

        this.log(`Opening ${filePath} in ${editor}...`)
        this.log('Save and close the editor when done editing.')

        const result = spawnSync(editor, [filePath], {
            stdio: 'inherit',
            shell: true,
        })

        if (result.error) {
            this.error(`Failed to open editor: ${result.error.message}`)
            return false
        }

        return result.status === 0
    }

    private async interactiveUpdate(umi: Umi, mint: string) {
        // Fetch the digital asset
        const fetchSpinner = ora('Fetching NFT data...').start()
        const asset = await fetchDigitalAsset(umi, publicKey(mint)).catch((err) => {
            fetchSpinner.fail('Failed to fetch NFT data')
            throw err
        })
        fetchSpinner.succeed(`NFT data fetched: ${asset.metadata.name}`)

        const isPnft = unwrapOptionRecursively(asset.metadata.tokenStandard) === TokenStandard.ProgrammableNonFungible

        if (isPnft) {
            this.log('Detected Programmable NFT (pNFT)')
        }

        // Fetch current metadata
        this.log('Fetching current metadata JSON...')
        const currentMetadata = await fetchJsonMetadata(umi, asset.metadata.uri).catch((error) => {
            this.error(
                `Failed to fetch JSON metadata: ${error instanceof Error ? error.message : String(error)}`
            )
        })

        // Create temp file
        const tempDir = os.tmpdir()
        const tempFile = path.join(tempDir, `nft-metadata-${mint.slice(0, 8)}.json`)

        // Write current metadata to temp file
        fs.writeFileSync(tempFile, JSON.stringify(currentMetadata, null, 2))
        this.log(`Metadata written to: ${tempFile}`)

        // Open in editor
        const editSuccess = this.openInEditor(tempFile)

        if (!editSuccess) {
            fs.unlinkSync(tempFile)
            this.error('Editor exited with an error. Update cancelled.')
        }

        // Read modified metadata
        let modifiedMetadata
        try {
            const fileContent = fs.readFileSync(tempFile, 'utf-8')
            modifiedMetadata = JSON.parse(fileContent)
        } catch (error) {
            fs.unlinkSync(tempFile)
            this.error(`Failed to parse modified JSON: ${error instanceof Error ? error.message : String(error)}`)
        }

        // Clean up temp file
        fs.unlinkSync(tempFile)

        // Upload new metadata
        const jsonUploadSpinner = ora('Uploading updated metadata...').start()
        const newMetadataUri = await uploadJson(umi, modifiedMetadata).catch((err) => {
            jsonUploadSpinner.fail('Failed to upload metadata')
            throw err
        })
        jsonUploadSpinner.succeed('Metadata uploaded')

        // Update on-chain
        const updateSpinner = ora('Updating NFT on-chain...').start()

        let updateIx

        if (isPnft) {
            const ruleSet = unwrapOptionRecursively(asset.metadata.programmableConfig)?.ruleSet

            if (ruleSet) {
                this.log(`Ruleset detected: ${ruleSet}`)
            }

            updateIx = updateAsUpdateAuthorityV2(umi, {
                mint: publicKey(mint),
                data: {
                    ...asset.metadata,
                    name: modifiedMetadata.name || asset.metadata.name,
                    symbol: modifiedMetadata.symbol || asset.metadata.symbol,
                    uri: newMetadataUri,
                },
                tokenStandard: TokenStandard.ProgrammableNonFungible,
                authorizationRules: ruleSet || undefined,
                authorizationRulesProgram: ruleSet ? TOKEN_AUTH_RULES_ID : undefined,
                authorizationData: undefined,
            })
        } else {
            updateIx = updateV1(umi, {
                mint: publicKey(mint),
                authority: umi.identity,
                data: {
                    ...asset.metadata,
                    name: modifiedMetadata.name || asset.metadata.name,
                    symbol: modifiedMetadata.symbol || asset.metadata.symbol,
                    uri: newMetadataUri,
                },
            })
        }

        const result = await updateIx.sendAndConfirm(umi).catch((err) => {
            updateSpinner.fail('Failed to update NFT')
            throw err
        })

        updateSpinner.succeed('NFT updated successfully!')

        return {
            asset,
            signature: result.signature,
        }
    }

    private async updateNft(
        umi: Umi,
        input: {
            mint: string
            name?: string
            symbol?: string
            uri?: string
            image?: string
            description?: string
        }
    ) {
        // Fetch the digital asset to determine if it's a pNFT
        const fetchSpinner = ora('Fetching NFT data...').start()
        const asset = await fetchDigitalAsset(umi, publicKey(input.mint)).catch((err) => {
            fetchSpinner.fail('Failed to fetch NFT data')
            throw err
        })
        fetchSpinner.succeed(`NFT data fetched: ${asset.metadata.name}`)

        const isPnft = unwrapOptionRecursively(asset.metadata.tokenStandard) === TokenStandard.ProgrammableNonFungible

        if (isPnft) {
            this.log('Detected Programmable NFT (pNFT)')
        }

        let newMetadataUri = input.uri

        // If URI is not provided, we need to fetch existing metadata and update it
        // This applies when updating any metadata field: name, symbol, description, or image
        if (!input.uri && (input.name || input.symbol || input.image || input.description)) {
            this.log('Fetching existing metadata to update JSON...')
            const originalJsonMetadata = await fetchJsonMetadata(umi, asset.metadata.uri).catch(
                (error) => {
                    this.log(
                        `Failed to fetch JSON metadata: ${error instanceof Error ? error.message : String(error)}`
                    )
                    return undefined
                }
            )

            // If metadata fetch failed and we're updating metadata fields, all fields must be provided
            if (!originalJsonMetadata) {
                if (!input.name || !input.description || !input.symbol || !input.image) {
                    this.error(
                        'Failed to fetch existing metadata. All fields (--name, --description, --symbol, --image) must be provided to update the NFT.'
                    )
                }
            }

            // Upload new image if provided
            const imageUploadSpinner = input.image && ora('Uploading Image...').start()
            const newImageUri = input.image && (await imageUploader(umi, input.image))
            imageUploadSpinner && imageUploadSpinner.succeed('Image uploaded')

            // Get the mime type for the new image or use the existing one
            const imageMimeType = input.image
                ? mime.getType(input.image) || 'application/octet-stream'
                : originalJsonMetadata?.properties?.files?.[0]?.type || 'image/png'

            // Create updated metadata JSON with proper structure
            const newMetadata = {
                ...originalJsonMetadata,
                name: input.name || originalJsonMetadata?.name,
                description: input.description || originalJsonMetadata?.description,
                symbol: input.symbol || originalJsonMetadata?.symbol,
                image: newImageUri || originalJsonMetadata?.image,
                properties: {
                    ...originalJsonMetadata?.properties,
                    files: [
                        {
                            uri: newImageUri || originalJsonMetadata?.image,
                            type: imageMimeType,
                        },
                        // Preserve any additional files (like animations) from original metadata
                        ...(originalJsonMetadata?.properties?.files?.slice(1) || []),
                    ],
                },
            }

            // Upload updated metadata JSON
            const jsonUploadSpinner = ora('Uploading JSON file...').start()
            newMetadataUri = await uploadJson(umi, newMetadata)
            jsonUploadSpinner.succeed('Uploaded JSON')
        }

        // Build update instruction
        const updateSpinner = ora('Updating NFT...').start()

        let updateIx

        if (isPnft) {
            // For pNFTs, use updateAsUpdateAuthorityV2
            const ruleSet = unwrapOptionRecursively(asset.metadata.programmableConfig)?.ruleSet

            if (ruleSet) {
                this.log(`Ruleset detected: ${ruleSet}`)
            }

            updateIx = updateAsUpdateAuthorityV2(umi, {
                mint: publicKey(input.mint),
                data: {
                    ...asset.metadata,
                    name: input.name || asset.metadata.name,
                    symbol: input.symbol || asset.metadata.symbol,
                    uri: newMetadataUri || asset.metadata.uri,
                },
                tokenStandard: TokenStandard.ProgrammableNonFungible,
                authorizationRules: ruleSet || undefined,
                authorizationRulesProgram: ruleSet ? TOKEN_AUTH_RULES_ID : undefined,
                authorizationData: undefined,
            })
        } else {
            // For regular NFTs, use simpler update
            updateIx = updateV1(umi, {
                mint: publicKey(input.mint),
                authority: umi.identity,
                data: {
                    ...asset.metadata,
                    name: input.name || asset.metadata.name,
                    symbol: input.symbol || asset.metadata.symbol,
                    uri: newMetadataUri || asset.metadata.uri,
                },
            })
        }

        const result = await updateIx.sendAndConfirm(umi).catch((err) => {
            updateSpinner.fail('Failed to update NFT')
            throw err
        })

        updateSpinner.succeed('NFT updated successfully!')

        return {
            asset,
            signature: result.signature,
        }
    }

    public async run(): Promise<unknown> {
        const { args, flags } = await this.parse(TmUpdate)
        const { umi, explorer, chain } = this.context

        this.log(
            `--------------------------------

    NFT Update

--------------------------------`
        )

        let result

        if (flags.editor) {
            // Editor mode: open JSON in editor
            result = await this.interactiveUpdate(umi, args.mint)
        } else {
            // Validate that at least one update flag is provided
            if (!flags.name && !flags.symbol && !flags.uri && !flags.image && !flags.description) {
                this.error('Nothing to update. Please provide at least one flag: --name, --symbol, --uri, --image, --description, or --editor')
            }

            result = await this.updateNft(umi, {
                mint: args.mint,
                name: flags.name,
                symbol: flags.symbol,
                uri: flags.uri,
                image: flags.image,
                description: flags.description,
            })
        }

        const signature = txSignatureToString(result.signature as Uint8Array)
        this.logSuccess(
            `--------------------------------
    NFT: ${result.asset.metadata.name}
    Mint: ${args.mint}
    Signature: ${signature}
    Explorer: ${generateExplorerUrl(explorer, chain, signature, 'transaction')}
--------------------------------`
        )

        return {
            mint: args.mint,
            signature,
        }
    }
}
