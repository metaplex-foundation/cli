import { Flags } from '@oclif/core'
import { createFungible } from '@metaplex-foundation/mpl-token-metadata'
import { createTokenIfMissing, findAssociatedTokenPda, mintTokensTo } from '@metaplex-foundation/mpl-toolbox'
import { generateSigner, percentAmount, Umi } from '@metaplex-foundation/umi'
import { base58 } from '@metaplex-foundation/umi/serializers'
import ora from 'ora'
import { TransactionCommand } from '../../../TransactionCommand.js'
import { ExplorerType, generateExplorerUrl } from '../../../explorers.js'
import umiSendAndConfirmTransaction from '../../../lib/umi/sendAndConfirm.js'
import imageUploader from '../../../lib/uploader/imageUploader.js'
import uploadJson from '../../../lib/uploader/uploadJson.js'
import { validateMintAmount, validateTokenName, validateTokenSymbol } from '../../../lib/validations.js'
import createTokenPrompt from '../../../prompts/createTokenPrompt.js'

/* 
  Create Possibilities:

  1. Create a Token with Wizard

  2. Create a Token with name, symbol, description, image, and mint amount

*/

interface TokenInput {
    name: string;
    symbol: string;
    description: string;
    image: string;
    decimals?: number;
    mintAmount: number;
}

interface WizardResponse {
    name?: string;
    symbol?: string;
    description?: string;
    image?: string;
    decimals?: number;
    mintAmount?: number;
}

const WELCOME_MESSAGE = `--------------------------------
Welcome to the Token Creator Wizard!

This wizard will guide you through the process of creating a new token.                
--------------------------------`;

const SUCCESS_MESSAGE = (
    mint: string,
    signature: Uint8Array,
    details: { name: string; symbol: string; decimals: number; mintAmount: number },
    options: { explorer: ExplorerType; executionTime?: number }
) => {
    const formattedAmount = details.decimals > 0 
        ? `${Math.floor(details.mintAmount / Math.pow(10, details.decimals))}.${details.mintAmount % Math.pow(10, details.decimals)}`
        : details.mintAmount.toString();

    const timingInfo = options.executionTime 
        ? `\nExecution Time: ${(options.executionTime / 1000).toFixed(4)} seconds`
        : '';

    return `--------------------------------
Token created successfully!

Token Details:
Name: ${details.name}
Symbol: ${details.symbol}
Decimals: ${details.decimals}
Initial Supply: ${formattedAmount}

Mint Address: ${mint}
Explorer: ${generateExplorerUrl(options.explorer, mint, 'account')}

Transaction Signature: ${base58.deserialize(signature)[0]}
Explorer: ${generateExplorerUrl(options.explorer, base58.deserialize(signature)[0], 'transaction')}${timingInfo}
--------------------------------`;
}

export default class ToolboxTokenCreate extends TransactionCommand<typeof ToolboxTokenCreate> {
    static override description = `Create a fungible token using 2 different methods:

  1. Simple Creation: Create a token by providing the name, symbol, and mint amount.
     Example: mplx toolbox token create --name "My Token" --symbol "TOKEN" --mint-amount 1000000

  2. Interactive Wizard: Create a token using the interactive wizard which guides you through the process.
     Example: mplx toolbox token create --wizard

  Additional Options:
  - Use --decimals to specify the number of decimal places (0-9, default: 0)
  - Use --description to add a description to your token
  - Use --image to add an image to your token metadata
  - Use --speed-run to measure execution time
  `

    static override examples = [
        '<%= config.bin %> <%= command.id %> --wizard',
        '<%= config.bin %> <%= command.id %> --name "My Token" --symbol "TOKEN" --description "My awesome token" --image ./image.png --decimals 2 --mint-amount 1000000',
    ]

    static override usage = 'toolbox token create [FLAGS]'

    static override flags = {
        wizard: Flags.boolean({
            description: 'Interactive mode that guides you through token creation step by step',
            required: false,
        }),
        'speed-run': Flags.boolean({
            description: 'Enable speed run mode to measure execution time',
            required: false,
        }),
        name: Flags.string({
            description: 'Name of the token (e.g., "My Awesome Token")',
            required: false,
            exclusive: ['wizard'],
        }),
        symbol: Flags.string({
            description: 'Token symbol (2-6 characters, e.g., "MAT")',
            required: false,
            exclusive: ['wizard'],
        }),
        decimals: Flags.integer({
            description: 'Number of decimal places (0-9, default: 0). Example: 2 decimals means 100 tokens = 100_00',
            required: false,
            exclusive: ['wizard'],
        }),
        description: Flags.string({
            description: 'Description of the token and its purpose',
            required: false,
            exclusive: ['wizard'],
        }),
        image: Flags.file({
            description: 'Path to the token image file (PNG, JPG, or GIF)',
            required: false,
            exclusive: ['wizard'],
        }),
        'mint-amount': Flags.integer({
            description: 'Initial amount of tokens to mint (must be greater than 0). Example: With 2 decimals, 1000 = 1000_00 tokens',
            required: false,
            exclusive: ['wizard'],
        }),
    }

    private async validateFlags(flags: {
        name?: string;
        symbol?: string;
        description?: string;
        image?: string;
        decimals?: number;
        'mint-amount'?: number;
        [key: string]: any;
    }) {
        const requiredFlags = ['name', 'symbol', 'mint-amount'];
        const missingFlags = requiredFlags.filter(flag => !flags[flag]);
        
        if (missingFlags.length > 0) {
            const flagDescriptions = missingFlags.map(flag => {
                switch (flag) {
                    case 'name':
                        return '--name: Name of the token (e.g., "My Awesome Token")';
                    case 'symbol':
                        return '--symbol: Token symbol (2-6 characters, e.g., "MAT")';
                    case 'mint-amount':
                        return '--mint-amount: Initial amount of tokens to mint (must be greater than 0). Example: With 2 decimals, 1000 = 1000_00 tokens';
                    default:
                        return `--${flag}: Required field`;
                }
            });
            
            throw new Error(
                `Missing required information:\n${flagDescriptions.join('\n')}\n\n` +
                'Please provide all required information or use --wizard for interactive mode.'
            );
        }

        // Using non-null assertions (!) here is safe because:
        // 1. We've already validated that these required fields exist above
        // 2. If any were missing, we would have thrown an error
        // 3. TypeScript can't infer this guarantee, so we need to tell it explicitly
        return {
            name: validateTokenName(flags.name!),
            symbol: validateTokenSymbol(flags.symbol!),
            description: flags.description || '',
            image: flags.image || '',
            decimals: flags.decimals ?? 0,
            mint: validateMintAmount(flags['mint-amount']!)
        };
    }

    private async uploadAsset(umi: Umi, type: 'image' | 'json', asset: any) {
        const spinner = ora(`Uploading ${type}...`).start();
        try {
            const uri = type === 'image' 
                ? await imageUploader(umi, asset)
                : await uploadJson(umi, asset);
            
            spinner.succeed(`${type} uploaded successfully`);
            return uri;
        } catch (error) {
            spinner.fail(`Failed to upload ${type}`);
            if (error instanceof Error) {
                throw new Error(`Failed to upload ${type}: ${error.message}`);
            }
            throw new Error(`Failed to upload ${type}: Unknown error occurred`);
        }
    }

    public async run() {
        const startTime = Date.now();
        const { flags } = await this.parse(ToolboxTokenCreate)
        const { umi, explorer } = this.context

        try {
            if (flags.wizard) {
                this.logSuccess(WELCOME_MESSAGE)
                const wizard = await createTokenPrompt() as WizardResponse

                if (!wizard?.name || !wizard?.symbol || !wizard?.mintAmount) {
                    throw new Error('Missing required fields in wizard response')
                }

                let imageUri = ''
                if (wizard?.image) {
                    imageUri = await this.uploadAsset(umi, 'image', wizard.image)
                }

                const jsonUri = await this.uploadAsset(umi, 'json', {
                    name: wizard.name,
                    symbol: wizard.symbol,
                    description: wizard.description || '',
                    image: imageUri,
                })

                if (!jsonUri) {
                    this.error('Failed to upload token metadata')
                }

                await this.createToken(umi, {
                    name: wizard.name,
                    symbol: wizard.symbol,
                    description: wizard.description || '',
                    image: jsonUri,
                    decimals: wizard.decimals ?? 0,
                    mintAmount: wizard.mintAmount,
                }, explorer as ExplorerType, flags['speed-run'] ? Date.now() - startTime : undefined)
            } else {
                const validatedFlags = await this.validateFlags(flags)
                let imageUri = ''
                if (flags.image) {
                    imageUri = await this.uploadAsset(umi, 'image', flags.image)
                }

                const jsonUri = await this.uploadAsset(umi, 'json', {
                    name: validatedFlags.name,
                    symbol: validatedFlags.symbol,
                    description: validatedFlags.description,
                    image: imageUri,
                })

                if (!jsonUri) {
                    this.error('Failed to upload token metadata')
                }

                await this.createToken(umi, {
                    name: validatedFlags.name,
                    symbol: validatedFlags.symbol,
                    description: validatedFlags.description,
                    image: jsonUri,
                    decimals: validatedFlags.decimals,
                    mintAmount: validatedFlags.mint
                }, explorer as ExplorerType, flags['speed-run'] ? Date.now() - startTime : undefined)
            }
        } catch (error) {
            if (flags['speed-run']) {
                const executionTime = Date.now() - startTime;
                this.error(`Command failed after ${(executionTime / 1000).toFixed(4)} seconds: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
            throw error;
        }
    }

    private async createToken(umi: Umi, input: TokenInput, explorer: ExplorerType, executionTime?: number) {
        const mint = generateSigner(umi)
        const createFunigbleIx = createFungible(umi, {
            mint,
            name: input.name,
            symbol: input.symbol,
            uri: input.image,
            decimals: input.decimals || 0,
            sellerFeeBasisPoints: percentAmount(0),
        })
            .add(createTokenIfMissing(umi, {
                mint: mint.publicKey,
                owner: umi.payer.publicKey,
            }))
            .add(mintTokensTo(umi, {
                mint: mint.publicKey,
                token: findAssociatedTokenPda(umi, { mint: mint.publicKey, owner: umi.payer.publicKey }),
                amount: input.mintAmount,
            }))

        const createSpinner = ora('Creating token on the blockchain...').start()
        try {
            const result = await umiSendAndConfirmTransaction(umi, createFunigbleIx)
            createSpinner.succeed('Token created successfully')

            if (!result.transaction.signature) {
                throw new Error('Transaction signature is missing')
            }

            this.logSuccess(SUCCESS_MESSAGE(
                mint.publicKey.toString(),
                result.transaction.signature as Uint8Array,
                {
                    name: input.name,
                    symbol: input.symbol,
                    decimals: input.decimals || 0,
                    mintAmount: input.mintAmount,
                },
                { explorer, executionTime }
            ))

            return result
        } catch (error: unknown) {
            createSpinner.fail('Token creation failed')
            if (error instanceof Error) {
                throw new Error(`Token creation failed: ${error.message}`)
            }
            throw new Error('An unknown error occurred during token creation')
        }
    }
}