import { Args, Flags } from '@oclif/core'

import {
    createMetadataAccountV3,
    findMetadataPda,
    safeFetchMetadata,
} from '@metaplex-foundation/mpl-token-metadata'
import { publicKey, Umi } from '@metaplex-foundation/umi'
import ora from 'ora'
import umiSendAndConfirmTransaction from '../../../lib/umi/sendAndConfirm.js'
import imageUploader from '../../../lib/uploader/imageUploader.js'
import uploadJson from '../../../lib/uploader/uploadJson.js'
import { TransactionCommand } from '../../../TransactionCommand.js'
import { ExplorerType, generateExplorerUrl } from '../../../explorers.js'
import { RpcChain, txSignatureToString } from '../../../lib/util.js'
import { validateTokenName, validateTokenSymbol } from '../../../lib/validations.js'

const SUCCESS_MESSAGE = (
    chain: RpcChain,
    mint: string,
    signature: Uint8Array,
    details: { name: string; symbol: string },
    options: { explorer: ExplorerType }
) => {
    return `--------------------------------
Metadata created successfully!

Token Details:
Name: ${details.name}
Symbol: ${details.symbol}

Mint Address: ${mint}
Explorer: ${generateExplorerUrl(options.explorer, chain, mint, 'account')}

Transaction Signature: ${txSignatureToString(signature)}
Explorer: ${generateExplorerUrl(options.explorer, chain, txSignatureToString(signature), 'transaction')}
--------------------------------`
}

export default class ToolboxTokenAddMetadata extends TransactionCommand<typeof ToolboxTokenAddMetadata> {
    static override description = `Add metadata to an existing token that doesn't have a metadata account.

This command checks if a token already has a metadata account (via PDA), and if not, creates one using CreateMetadataAccountV3.

Use this for tokens that were created without metadata (e.g., via spl-token CLI).`

    static override examples = [
        '<%= config.bin %> <%= command.id %> <mintAddress> --name "My Token" --symbol "MTK"',
        '<%= config.bin %> <%= command.id %> <mintAddress> --name "My Token" --symbol "MTK" --uri "https://example.com/metadata.json"',
        '<%= config.bin %> <%= command.id %> <mintAddress> --name "My Token" --symbol "MTK" --description "A great token" --image ./logo.png',
    ]

    static override usage = 'toolbox token add-metadata <mint> [FLAGS]'

    static override args = {
        mint: Args.string({ description: 'Mint address of the token.', required: true }),
    }

    static override flags = {
        name: Flags.string({
            description: 'Name of the token (e.g., "My Awesome Token")',
            required: true,
        }),
        symbol: Flags.string({
            description: 'Token symbol (2-6 characters, e.g., "MAT")',
            required: true,
        }),
        uri: Flags.string({
            description: 'URI pointing to the metadata JSON. If not provided, metadata will be uploaded.',
            exclusive: ['image', 'description'],
        }),
        description: Flags.string({
            description: 'Description of the token (used when uploading metadata)',
            exclusive: ['uri'],
        }),
        image: Flags.file({
            description: 'Path to the token image file (used when uploading metadata)',
            exclusive: ['uri'],
        }),
        'is-mutable': Flags.boolean({
            description: 'Whether the metadata can be updated later (default: true)',
            default: true,
            allowNo: true,
        }),
    }

    public async run() {
        const { args, flags } = await this.parse(ToolboxTokenAddMetadata)
        const { umi, explorer, chain } = this.context

        this.logSuccess(
            `--------------------------------

    Add Token Metadata

--------------------------------`
        )

        // Validate inputs
        const name = validateTokenName(flags.name)
        const symbol = validateTokenSymbol(flags.symbol)

        const mintPubkey = publicKey(args.mint)

        // Check if metadata already exists
        const checkSpinner = ora('Checking for existing metadata...').start()

        const metadataPda = findMetadataPda(umi, { mint: mintPubkey })
        const existingMetadata = await safeFetchMetadata(umi, metadataPda)

        if (existingMetadata) {
            checkSpinner.fail('Metadata already exists for this token')
            this.log(`\nExisting metadata:`)
            this.log(`  Name: ${existingMetadata.name}`)
            this.log(`  Symbol: ${existingMetadata.symbol}`)
            this.log(`  URI: ${existingMetadata.uri}`)
            this.log(`\nUse "mplx toolbox token update" to update existing metadata.`)
            return
        }

        checkSpinner.succeed('No existing metadata found')

        // Determine the URI
        let metadataUri = flags.uri

        if (!metadataUri) {
            // Upload metadata
            let imageUri = ''

            if (flags.image) {
                const imageSpinner = ora('Uploading image...').start()
                try {
                    imageUri = await imageUploader(umi, flags.image)
                    imageSpinner.succeed('Image uploaded')
                } catch (error) {
                    imageSpinner.fail('Failed to upload image')
                    throw error
                }
            }

            const jsonSpinner = ora('Uploading metadata JSON...').start()
            try {
                metadataUri = await uploadJson(umi, {
                    name,
                    symbol,
                    description: flags.description || '',
                    image: imageUri,
                })
                jsonSpinner.succeed('Metadata JSON uploaded')
            } catch (error) {
                jsonSpinner.fail('Failed to upload metadata JSON')
                throw error
            }
        }

        // Create the metadata account
        const createSpinner = ora('Creating metadata account...').start()

        try {
            const createIx = createMetadataAccountV3(umi, {
                metadata: metadataPda,
                mint: mintPubkey,
                mintAuthority: umi.identity,
                payer: umi.payer,
                updateAuthority: umi.identity.publicKey,
                data: {
                    name,
                    symbol,
                    uri: metadataUri,
                    sellerFeeBasisPoints: 0,
                    creators: null,
                    collection: null,
                    uses: null,
                },
                isMutable: flags['is-mutable'],
                collectionDetails: null,
            })

            const result = await umiSendAndConfirmTransaction(umi, createIx)

            createSpinner.succeed('Metadata account created')

            if (!result.transaction.signature) {
                throw new Error('Transaction signature is missing')
            }

            this.logSuccess(
                SUCCESS_MESSAGE(
                    chain,
                    args.mint,
                    result.transaction.signature as Uint8Array,
                    { name, symbol },
                    { explorer }
                )
            )
        } catch (error) {
            createSpinner.fail('Failed to create metadata account')
            throw error
        }
    }
}
