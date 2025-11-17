import { Args, Flags } from '@oclif/core'

import { fetchDigitalAsset, fetchJsonMetadata, updateV1 } from '@metaplex-foundation/mpl-token-metadata'
import { publicKey, Umi } from '@metaplex-foundation/umi'
import ora from 'ora'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { spawnSync } from 'node:child_process'
import mime from 'mime'
import umiSendAndConfirmTransaction from '../../../lib/umi/sendAndConfirm.js'
import imageUploader from '../../../lib/uploader/imageUploader.js'
import uploadJson from '../../../lib/uploader/uploadJson.js'
import { TransactionCommand } from '../../../TransactionCommand.js'


/*
  Update Token Possibilities:

  1. Update a token via flags.
  2. Update a token via interactive editor.

*/

export default class ToolboxTokenUpdate extends TransactionCommand<typeof ToolboxTokenUpdate> {
    static override description = 'Update token metadata including name, description, symbol, and image. Use --editor to edit the metadata JSON in your default editor.'

    static override examples = [
        '<%= config.bin %> <%= command.id %> toolbox token update <mintAddress> <flags>',
        '<%= config.bin %> <%= command.id %> toolbox token update <mintAddress> --name "New Name" --description "New Description" --image ./image.png',
        '<%= config.bin %> <%= command.id %> toolbox token update <mintAddress> --editor',
    ]

    static override args = {
        mint: Args.string({ description: "Mint address of the token to be updated.", required: true })
    }

    static override flags = {
        image: Flags.file({ description: 'Image path for new token image.', exclusive: ['editor'] }),
        name: Flags.string({ description: 'New name of the token.', exclusive: ['editor'] }),
        description: Flags.string({ description: 'New description of the token', exclusive: ['editor'] }),
        symbol: Flags.string({ description: 'New symbol of the token.', exclusive: ['editor'] }),
        editor: Flags.boolean({
            char: 'e',
            description: 'Open the metadata JSON in your default editor for editing',
            exclusive: ['name', 'symbol', 'image', 'description'],
        }),
    }


    public async run() {
        const { args, flags } = await this.parse(ToolboxTokenUpdate)

        const { umi } = this.context

        this.logSuccess(
            `--------------------------------

    Token Update

--------------------------------`
        )

        if (flags.editor) {
            // Editor mode: open JSON in editor
            await this.interactiveUpdate(umi, args.mint)
        } else {
            if (!flags.name && !flags.description && !flags.image && !flags.symbol) {
                this.error("Nothing to update. Please provide at least one flag: --name, --description, --symbol, --image, or --editor")
            }

            await this.updateToken(umi, { mint: args.mint, name: flags.name, description: flags.description, image: flags.image, symbol: flags.symbol })
        }
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
        const fetchSpinner = ora('Fetching token data...').start()
        const originalToken = await fetchDigitalAsset(umi, publicKey(mint)).catch((err) => {
            fetchSpinner.fail('Failed to fetch token data')
            throw err
        })
        fetchSpinner.succeed(`Token data fetched: ${originalToken.metadata.name}`)

        // Fetch current metadata
        this.log('Fetching current metadata JSON...')
        const originalJsonMetadata = await fetchJsonMetadata(umi, originalToken.metadata.uri).catch((error) => {
            this.error(
                `Failed to fetch JSON metadata: ${error instanceof Error ? error.message : String(error)}`
            )
        })

        // Create temp file
        const tempDir = os.tmpdir()
        const tempFile = path.join(tempDir, `token-metadata-${mint.slice(0, 8)}.json`)

        // Write current metadata to temp file
        fs.writeFileSync(tempFile, JSON.stringify(originalJsonMetadata, null, 2))
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

        // Get the mime type for the image or use the existing one
        const imageMimeType = originalJsonMetadata?.properties?.files?.[0]?.type || 'image/png'

        // Ensure proper metadata structure
        const newMetadata = {
            ...modifiedMetadata,
            properties: {
                ...modifiedMetadata?.properties,
                files: modifiedMetadata?.properties?.files || [
                    {
                        uri: modifiedMetadata.image,
                        type: imageMimeType,
                    },
                ],
            },
        }

        // Upload new metadata
        const jsonUploadSpinner = ora('Uploading updated metadata...').start()
        const newMetadataUri = await uploadJson(umi, newMetadata).catch((err) => {
            jsonUploadSpinner.fail('Failed to upload metadata')
            throw err
        })
        jsonUploadSpinner.succeed('Metadata uploaded')

        // Update on-chain
        const updateTokenSpinner = ora('Updating token...').start()
        const updateIx = updateV1(umi, {
            mint: publicKey(mint),
            data: {
                ...originalToken.metadata,
                name: modifiedMetadata.name || originalToken.metadata.name,
                uri: newMetadataUri,
                symbol: modifiedMetadata.symbol || originalToken.metadata.symbol,
                sellerFeeBasisPoints: 0
            }
        })

        await umiSendAndConfirmTransaction(umi, updateIx).then(
            (res) => {
                updateTokenSpinner.succeed('Update transaction sent and confirmed.')
                this.logSuccess('Token successfully updated!')
            }
        ).catch(err => {
            updateTokenSpinner.fail(err)
        })
    }


    private async updateToken(umi: Umi, input: { mint: string, name?: string, description?: string, image?: string, symbol?: string }) {


        const originalToken = await fetchDigitalAsset(umi, publicKey(input.mint))

        const originalJsonMetadata = await fetchJsonMetadata(umi, originalToken.metadata.uri)
        .catch(error => {
            this.log(`Failed to fetch JSON metadata: ${error instanceof Error ? error.message : String(error)}`);
            return undefined;
        });

        // If metadata fetch failed, all fields must be provided
        if (!originalJsonMetadata) {
            if (!input.name || !input.description || !input.symbol || !input.image) {
                this.error('Failed to fetch existing metadata. All fields (--name, --description, --symbol, --image) must be provided to update the token.');
            }
        }

        const imageUploadSpinner = input.image && ora("Uploading Image...").start()
        const newImageUri = input.image && await imageUploader(umi, input.image)
        imageUploadSpinner && imageUploadSpinner.succeed("Image uploaded")

        const newMetadata = {
            ...originalJsonMetadata,
            name: input.name || originalJsonMetadata?.name,
            description: input.description || originalJsonMetadata?.description,
            symbol: input.symbol || originalJsonMetadata?.symbol,
            image: newImageUri || originalJsonMetadata?.image
        }

        const jsonUploadSpinner = ora("Uploading JSON file...").start()
        const newMetadataUri = await uploadJson(umi, newMetadata);
        jsonUploadSpinner.succeed("Uploaded JSON")

        const updateTokenSpinner = ora("Updating Token...").start()
        const updateIx = updateV1(umi, {
            mint: publicKey(input.mint),
            data: {
                ...originalToken.metadata,
                name: input.name || originalToken.metadata.name,
                uri: newMetadataUri,
                symbol: input.symbol || originalToken.metadata.symbol,
                sellerFeeBasisPoints: 0
            }
        })

        //send transaction

        await umiSendAndConfirmTransaction(umi, updateIx).then(
            (res) => {
                updateTokenSpinner.succeed('Update transaction sent and confirmed.')
                this.logSuccess('Token successfully updated!')
            }
        ).catch(err => {
            updateTokenSpinner.fail(err)
        })
    }
}
