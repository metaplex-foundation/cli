import { Flags } from '@oclif/core'

import { createFungible } from '@metaplex-foundation/mpl-token-metadata'
import { createTokenIfMissing, findAssociatedTokenPda, mintTokensTo } from '@metaplex-foundation/mpl-toolbox'
import { generateSigner, percentAmount, Umi } from '@metaplex-foundation/umi'
import { base58 } from '@metaplex-foundation/umi/serializers'
import ora from 'ora'
import { TransactionCommand } from '../../../TransactionCommand.js'
import umiSendAndConfirmTransaction from '../../../lib/umi/sendAndConfirm.js'
import imageUploader from '../../../lib/uploader/imageUploader.js'
import uploadJson from '../../../lib/uploader/uploadJson.js'
import createTokenPrompt from '../../../prompts/createTokenPrompt.js'
import { validateTokenName, validateTokenSymbol, validateMintAmount } from '../../../lib/validations.js'


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
    mint?: number;
}

const WELCOME_MESSAGE = `--------------------------------
Welcome to the Token Creator Wizard!

This wizard will guide you through the process of creating a new token.                
--------------------------------`;

const SUCCESS_MESSAGE = (mint: string, signature: string) => `--------------------------------
Token created successfully
Mint: ${mint}
Signature: ${signature}
--------------------------------`;

export default class ToolboxTokenCreate extends TransactionCommand<typeof ToolboxTokenCreate> {
    static override description = 'Create a fungible token'

    static override examples = [
        '<%= config.bin %> <%= command.id %>  toolbox token create --wizard',
        '<%= config.bin %> <%= command.id %> toolbox token create --name "My Token" --symbol "TOKEN" --decimals 2 --image ./image.png --mint 1000000000',
    ]

    static override flags = {
        wizard: Flags.boolean({ 
            description: 'Interactive mode that guides you through token creation step by step', 
            required: false 
        }),
        name: Flags.string({ 
            description: 'Name of the token (e.g., "My Awesome Token")', 
            required: false, 
            exclusive: ['wizard'] 
        }),
        symbol: Flags.string({ 
            description: 'Token symbol (2-6 characters, e.g., "MAT")', 
            required: false, 
            exclusive: ['wizard'] 
        }),
        decimals: Flags.integer({ 
            description: 'Number of decimal places (0-9, default: 0)', 
            required: false, 
            exclusive: ['wizard'] 
        }),
        description: Flags.string({ 
            description: 'Description of the token and its purpose', 
            required: false, 
            exclusive: ['wizard'] 
        }),
        image: Flags.file({ 
            description: 'Path to the token image file (PNG, JPG, or GIF)', 
            required: false, 
            exclusive: ['wizard'] 
        }),
        mint: Flags.integer({ 
            name: 'mint-amount', 
            description: 'Initial amount of tokens to mint (must be greater than 0)', 
            required: false, 
            exclusive: ['wizard'] 
        }),
    }

    private async validateFlags(flags: {
        name?: string;
        symbol?: string;
        description?: string;
        image?: string;
        mint?: number;
        [key: string]: any;
    }) {
        const requiredFlags = ['name', 'symbol', 'description', 'image', 'mint'];
        const missingFlags = requiredFlags.filter(flag => !flags[flag]);
        
        if (missingFlags.length > 0) {
            const flagDescriptions = missingFlags.map(flag => {
                switch (flag) {
                    case 'name':
                        return '--name: Name of the token (e.g., "My Awesome Token")';
                    case 'symbol':
                        return '--symbol: Token symbol (2-6 characters, e.g., "MAT")';
                    case 'description':
                        return '--description: Description of the token and its purpose';
                    case 'image':
                        return '--image: Path to the token image file (PNG, JPG, or GIF)';
                    case 'mint':
                        return '--mint-amount: Initial amount of tokens to mint (must be greater than 0)';
                    default:
                        return `--${flag}: Required field`;
                }
            });
            
            throw new Error(
                `Missing required information:\n${flagDescriptions.join('\n')}\n\n` +
                'Please provide all required information or use --wizard for interactive mode.'
            );
        }

        return {
            name: validateTokenName(flags.name as string),
            symbol: validateTokenSymbol(flags.symbol as string),
            description: flags.description as string,
            image: flags.image as string,
            mint: validateMintAmount(flags.mint as number)
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
        const { args, flags } = await this.parse(ToolboxTokenCreate)
        const { umi } = this.context

        if (flags.wizard) {
            this.logSuccess(WELCOME_MESSAGE)
            const wizard = await createTokenPrompt() as WizardResponse

            if (!wizard?.name || !wizard?.symbol || !wizard?.mint) {
                throw new Error('Missing required fields in wizard response');
            }

            let imageUri = '';
            if (wizard?.image) {
                imageUri = await this.uploadAsset(umi, 'image', wizard.image);
            }

            const jsonUri = await this.uploadAsset(umi, 'json', {
                name: wizard.name,
                symbol: wizard.symbol,
                description: wizard.description || '',
                image: imageUri,
            });

            if (!jsonUri) {
                this.error('Failed to upload token metadata');
            }

            await this.createToken(umi, {
                name: wizard.name,
                symbol: wizard.symbol,
                description: wizard.description || '',
                image: jsonUri,
                mintAmount: wizard.mint
            });
        } else {
            const validatedFlags = await this.validateFlags(flags);

            const imageUri = await this.uploadAsset(umi, 'image', validatedFlags.image);

            const jsonUri = await this.uploadAsset(umi, 'json', {
                name: validatedFlags.name,
                symbol: validatedFlags.symbol,
                description: validatedFlags.description,
                image: imageUri,
            });

            if (!jsonUri) {
                this.error('Failed to upload token metadata');
            }

            await this.createToken(umi, {
                name: validatedFlags.name,
                symbol: validatedFlags.symbol,
                description: validatedFlags.description,
                image: jsonUri,
                mintAmount: validatedFlags.mint
            });
        }
    }

    private async createToken(umi: Umi, input: TokenInput) {
        const mint = generateSigner(umi);
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
            }));

        const createSpinner = ora('Creating token on the blockchain...').start();
        try {
            const result = await umiSendAndConfirmTransaction(umi, createFunigbleIx);
            createSpinner.succeed('Token created successfully');

            this.logSuccess(SUCCESS_MESSAGE(
                mint.publicKey.toString(),
                base58.deserialize(result.transaction.signature as Uint8Array)[0]
            ));

            this.logSuccess(
                `\nToken Details:
                Name: ${input.name}
                Symbol: ${input.symbol}
                Decimals: ${input.decimals || 0}
                Initial Supply: ${input.mintAmount}
                \nYou can now use this token in your applications!`
            );

            return result;
        } catch (error: unknown) {
            createSpinner.fail('Token creation failed');
            if (error instanceof Error) {
                throw new Error(`Token creation failed: ${error.message}`);
            }
            throw new Error('An unknown error occurred during token creation');
        }
    }
}
