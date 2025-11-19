import { Flags } from '@oclif/core'
import { createNft, createProgrammableNft } from '@metaplex-foundation/mpl-token-metadata'
import { generateSigner, percentAmount, publicKey, some, Signer, Umi } from '@metaplex-foundation/umi'
import ora from 'ora'
import fs from 'node:fs'
import untildify from 'untildify'
import mime from 'mime'
import { TransactionCommand } from '../../TransactionCommand.js'
import { ExplorerType, generateExplorerUrl } from '../../explorers.js'
import uploadFile from '../../lib/uploader/uploadFile.js'
import uploadJson from '../../lib/uploader/uploadJson.js'
import createTokenMetadataPrompt, { CreateTokenMetadataPromptResult, NftType } from '../../prompts/createTokenMetadataPrompt.js'
import { txSignatureToString } from '../../lib/util.js'

interface NftInput {
    nftSigner?: Signer;
    name: string;
    uri: string;
    sellerFeePercentage?: number;
    collection?: string;
    isProgrammable?: boolean;
}

const formatNftResult = (result: any, explorer: ExplorerType, chain: any): string => {
    const signature = txSignatureToString(result.signature as Uint8Array)
    return `--------------------------------
  NFT: ${result.mint}
  Signature: ${signature}
  Explorer: ${generateExplorerUrl(explorer, chain, signature, 'transaction')}
--------------------------------`
}

export default class TmCreate extends TransactionCommand<typeof TmCreate> {
    static override description = `Create an MPL Token Metadata NFT using 4 different methods:

  1. Interactive Wizard: Create an NFT using the interactive wizard which guides you through the process.
     Example: mplx tm create --wizard

  2. File-based Creation: Create an NFT by providing an image file and a JSON metadata file.
     Example: mplx tm create --image "./my-nft.png" --json "./metadata.json"

  3. URI Creation: Create an NFT using existing metadata that's already online.
     Example: mplx tm create --name "My NFT" --uri "https://example.com/metadata.json"

  4. Manual Creation: Create an NFT by providing all metadata arguments manually.
     Example: mplx tm create --name "My NFT" --image "./my-nft.png" --attributes "trait1:value1,trait2:value2"

  Additional Options:
  - Use --collection to specify a collection ID for the NFT
  - Use --type to specify NFT type: "pnft" (default) or "nft"
  - Use --attributes to specify NFT attributes in format "trait1:value1,trait2:value2"
  `

    static override examples = [
        '$ mplx tm create --wizard',
        '$ mplx tm create --image "./my-nft.png" --json "./metadata.json"',
        '$ mplx tm create --name "My NFT" --uri "https://example.com/metadata.json"',
        '$ mplx tm create --name "My NFT" --image "./my-nft.png" --attributes "trait1:value1,trait2:value2" --royalties 5',
        '$ mplx tm create --name "My NFT" --image "./my-nft.png" --project-url "https://myproject.com" --royalties 10',
        '$ mplx tm create --name "My NFT" --uri "https://example.com/metadata.json" --type nft',
    ]

    static override usage = 'tm create [FLAGS]'

    static override flags = {
        wizard: Flags.boolean({ 
            description: 'Use interactive wizard to create NFT', 
            required: false 
        }),
        // Manual creation flags
        name: Flags.string({ 
            name: 'name', 
            description: 'NFT name', 
            exclusive: ['wizard', 'json'] 
        }),
        uri: Flags.string({ 
            name: 'uri', 
            description: 'URI of the NFT metadata (alternative to creating metadata from other flags)', 
            exclusive: ['wizard', 'json', 'image', 'attributes', 'description', 'animation', 'project-url'] 
        }),
        // File-based creation with JSON metadata file
        json: Flags.string({ 
            name: 'json', 
            description: 'path to JSON metadata file', 
            exclusive: ['wizard', 'name', 'uri', 'attributes', 'description', 'project-url', 'animation'],
            dependsOn: ['image']
        }),
        // Metadata creation from individual flags
        image: Flags.string({ 
            name: 'image', 
            description: 'path to image file to upload and assign to NFT',
            exclusive: ['wizard', 'uri']
        }),
        attributes: Flags.string({ 
            name: 'attributes', 
            description: 'Attributes of the NFT "trait1:value1,trait2:value2"',
            exclusive: ['wizard', 'uri', 'json']
        }),
        description: Flags.string({ 
            name: 'description', 
            description: 'description of the NFT',
            exclusive: ['wizard', 'uri', 'json']
        }),
        animation: Flags.string({ 
            name: 'animation', 
            description: 'path to animation file to upload and assign to NFT',
            exclusive: ['wizard', 'uri', 'json']
        }),
        'project-url': Flags.string({ 
            name: 'project-url', 
            description: 'external URL of the project',
            exclusive: ['wizard', 'uri', 'json']
        }),
        royalties: Flags.integer({
            name: 'royalties',
            description: 'royalty percentage for secondary sales (0-100)',
            exclusive: ['wizard', 'uri', 'json'],
            min: 0,
            max: 100
        }),
        // Additional flags that can be used with any mode
        collection: Flags.string({
            name: 'collection',
            description: 'Collection ID'
        }),
        type: Flags.string({
            description: 'Type of NFT to create',
            options: ['nft', 'pnft'],
            default: 'pnft',
        }),
    }

    private async handleFileBasedCreation(umi: Umi, imagePath: string, jsonPath: string, collection?: string, isProgrammable: boolean = true) {
        const imageSpinner = ora('Uploading image...').start()
        const imageUri = await uploadFile(umi, imagePath).catch((err) => {
            imageSpinner.fail(`Failed to upload image. ${err}`)
            throw err
        })
        imageSpinner.succeed(`Image uploaded to ${imageUri.uri}`)

        const jsonFile = JSON.parse(fs.readFileSync(untildify(jsonPath), 'utf-8'))
        jsonFile.image = imageUri.uri
        jsonFile.properties.files[0] = {
            uri: imageUri.uri,
            type: imageUri.mimeType,
        }

        const jsonSpinner = ora('Uploading JSON...').start()
        const jsonUri = await uploadJson(umi, jsonFile).catch((err) => {
            jsonSpinner.fail(`Failed to upload json. ${err}`)
            throw err
        })
        jsonSpinner.succeed(`JSON uploaded to ${jsonUri}`)

        const nftSpinner = ora('Creating NFT...').start()
        const nftSigner = generateSigner(umi)

        const result = await this.createNftFromArgs(umi, {
            nftSigner,
            name: jsonFile.name,
            uri: jsonUri,
            collection,
            isProgrammable,
        }).catch((err) => {
            nftSpinner.fail(`Failed to create NFT: ${err}`)
            throw err
        })

        nftSpinner.succeed('NFT created successfully')
        this.log(formatNftResult(result, this.context.explorer, this.context.chain))
        return result
    }

    private parseAttributes(attributesString?: string) {
        if (!attributesString) return []

        const attributes = []
        const segments = attributesString.split(',')
        
        for (const segment of segments) {
            // Skip empty segments
            const trimmedSegment = segment.trim()
            if (!trimmedSegment) continue
            
            // Check if segment contains at least one colon
            const colonIndex = trimmedSegment.indexOf(':')
            if (colonIndex === -1) {
                throw new Error(`Invalid attribute format: "${trimmedSegment}". Expected format: "trait:value"`)
            }
            
            // Split into trait_type and value (allow colons in value)
            const trait_type = trimmedSegment.substring(0, colonIndex).trim()
            const value = trimmedSegment.substring(colonIndex + 1).trim()
            
            // Ensure neither trait_type nor value is empty
            if (!trait_type) {
                throw new Error(`Invalid attribute: missing trait type in "${trimmedSegment}"`)
            }
            if (!value) {
                throw new Error(`Invalid attribute: missing value for trait "${trait_type}"`)
            }
            
            attributes.push({ trait_type, value })
        }
        
        return attributes
    }

    private async createAndUploadMetadata(umi: Umi, wizard: CreateTokenMetadataPromptResult, additionalAttributes?: any[]) {
        // Upload image file (required)
        const imageSpinner = ora('Uploading image...').start()
        const imageResult = await uploadFile(umi, wizard.image).catch((err) => {
            imageSpinner.fail(`Failed to upload image. ${err}`)
            throw err
        })
        imageSpinner.succeed(`Image uploaded to ${imageResult.uri}`)

        // Upload animation file if provided
        let animationUri: string | undefined
        let animationMimeType: string | undefined
        if (wizard.animation) {
            const animationSpinner = ora('Uploading animation...').start()
            const animationResult = await uploadFile(umi, wizard.animation).catch((err) => {
                animationSpinner.fail(`Failed to upload animation. ${err}`)
                throw err
            })
            animationSpinner.succeed(`Animation uploaded to ${animationResult.uri}`)
            animationUri = animationResult.uri
            animationMimeType = animationResult.mimeType || mime.getType(wizard.animation) || 'application/octet-stream'
        }

        // Combine attributes from wizard and additional attributes
        const allAttributes = [...(wizard.attributes || []), ...(additionalAttributes || [])]

        // Create and upload metadata JSON
        const imageMimeType = imageResult.mimeType || mime.getType(wizard.image) || 'application/octet-stream'
        const metadata = {
            name: wizard.name,
            description: wizard.description,
            external_url: wizard.external_url,
            attributes: allAttributes,
            image: imageResult.uri,
            animation_url: animationUri,
            properties: {
                files: [
                    {
                        uri: imageResult.uri,
                        type: imageMimeType
                    },
                    ...(animationUri ? [{
                        uri: animationUri,
                        type: animationMimeType || {
                            image: 'image/png',
                            video: 'video/mp4',
                            audio: 'audio/mpeg',
                            model: 'model/gltf-binary'
                        }[wizard.nftType as NftType]
                    }] : [])
                ],
                category: wizard.nftType
            }
        }

        const jsonSpinner = ora('Uploading metadata...').start()
        const jsonUri = await uploadJson(umi, metadata).catch((err) => {
            jsonSpinner.fail(`Failed to upload metadata. ${err}`)
            throw err
        })
        jsonSpinner.succeed(`Metadata uploaded to ${jsonUri}`)

        return jsonUri
    }

    private async createMetadataFromFlags(umi: Umi, flags: any) {
        let imageUri = ''
        let imageMimeType = ''
        if (flags.image) {
            const imageSpinner = ora('Uploading image...').start()
            const imageResult = await uploadFile(umi, flags.image).catch((err) => {
                imageSpinner.fail(`Failed to upload image. ${err}`)
                throw err
            })
            imageSpinner.succeed(`Image uploaded to ${imageResult.uri}`)
            imageUri = imageResult.uri
            imageMimeType = imageResult.mimeType || mime.getType(flags.image) || 'application/octet-stream'
        }

        // Parse attributes from command line
        const attributes = this.parseAttributes(flags.attributes)

        // Create metadata JSON
        const metadata = {
            name: flags.name,
            description: flags.description || '',
            external_url: flags['project-url'] || '',
            attributes: attributes,
            image: imageUri,
            properties: {
                files: imageUri ? [{
                    uri: imageUri,
                    type: imageMimeType
                }] : []
            }
        }

        const jsonSpinner = ora('Uploading metadata...').start()
        const jsonUri = await uploadJson(umi, metadata).catch((err) => {
            jsonSpinner.fail(`Failed to upload metadata. ${err}`)
            throw err
        })
        jsonSpinner.succeed(`Metadata uploaded to ${jsonUri}`)

        return jsonUri
    }

    private async createNftFromArgs(umi: Umi, input: NftInput) {
        this.log(`[DEBUG] createNftFromArgs called with isProgrammable: ${input.isProgrammable}`)
        const mint = input.nftSigner || generateSigner(umi)
        const createNftIx = input.isProgrammable
            ? createProgrammableNft(umi, {
                mint,
                name: input.name,
                uri: input.uri,
                sellerFeeBasisPoints: percentAmount(input.sellerFeePercentage || 0),
                collection: input.collection ? some({ key: publicKey(input.collection), verified: false }) : undefined,
            })
            : createNft(umi, {
                mint,
                name: input.name,
                uri: input.uri,
                sellerFeeBasisPoints: percentAmount(input.sellerFeePercentage || 0),
                collection: input.collection ? some({ key: publicKey(input.collection), verified: false }) : undefined,
            })

        const result = await createNftIx.sendAndConfirm(umi)
        return {
            mint: mint.publicKey.toString(),
            signature: result.signature,
        }
    }

    public async run(): Promise<unknown> {
        const { flags } = await this.parse(TmCreate)
        const { umi, explorer } = this.context

        if (flags.wizard) {
            // Wizard mode: Interactive creation
            this.log(
                `--------------------------------
    
    Welcome to the NFT Creator Wizard!

    This wizard will guide you through the process of creating a new NFT.                
                
--------------------------------`
            )

            const wizardData = await createTokenMetadataPrompt()
            const jsonUri = await this.createAndUploadMetadata(umi, wizardData)

            const spinner = ora('Creating NFT...').start()
            const nftSigner = generateSigner(umi)

            const result = await this.createNftFromArgs(umi, {
                nftSigner,
                name: wizardData.name,
                uri: jsonUri,
                collection: wizardData.collection,
                isProgrammable: wizardData.enforceRoyalties,
                sellerFeePercentage: wizardData.sellerFeePercentage,
            }).catch((err) => {
                spinner.fail(`Failed to create NFT. ${err}`)
                throw err
            })

            spinner.succeed('NFT created successfully')
            this.log(formatNftResult(result, explorer, this.context.chain))
            return result

        } else if (flags.json) {
            // File-based creation: Use existing JSON metadata file with image
            if (!flags.image) {
                this.error('You must provide --image when using --json')
            }

            const result = await this.handleFileBasedCreation(umi, flags.image, flags.json, flags.collection, flags.type === 'pnft')
            return result

        } else if (flags.name && flags.uri) {
            // URI flow: Use existing metadata URI (simplest case)
            this.log(`Creating ${flags.type === 'pnft' ? 'Programmable NFT (pNFT)' : 'NFT'}...`)
            const spinner = ora('Minting NFT...').start()
            const nftSigner = generateSigner(umi)

            const result = await this.createNftFromArgs(umi, {
                nftSigner,
                name: flags.name,
                uri: flags.uri,
                collection: flags.collection,
                isProgrammable: flags.type === 'pnft',
                sellerFeePercentage: flags.royalties,
            }).catch((err) => {
                spinner.fail(`Failed to create NFT. ${err}`)
                throw err
            })

            spinner.succeed('NFT created successfully')
            this.log(formatNftResult(result, explorer, this.context.chain))
            return result

        } else if (flags.name && flags.image) {
            // Manual flow: Create metadata from individual flags
            const metadataUri = await this.createMetadataFromFlags(umi, flags)

            const spinner = ora('Creating NFT...').start()
            const nftSigner = generateSigner(umi)

            const result = await this.createNftFromArgs(umi, {
                nftSigner,
                name: flags.name,
                uri: metadataUri,
                collection: flags.collection,
                isProgrammable: flags.type === 'pnft',
                sellerFeePercentage: flags.royalties,
            }).catch((err) => {
                spinner.fail(`Failed to create NFT. ${err}`)
                throw err
            })

            spinner.succeed('NFT created successfully')
            this.log(formatNftResult(result, explorer, this.context.chain))
            return result

        } else {
            this.error('You must provide one of the following combinations:\n' +
                      '  --wizard (interactive mode)\n' +
                      '  --image and --json (file-based creation)\n' +
                      '  --name and --uri (use existing metadata)\n' +
                      '  --name and --image (create metadata from flags)')
        }
    }

}