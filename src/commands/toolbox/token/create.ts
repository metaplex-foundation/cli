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


/* 
  Create Possibilities:

  1. Create a Token with Wizard

  2. Create a Token with name, symbol, description, image, and mint amount

*/

export default class ToolboxTokenCreate extends TransactionCommand<typeof ToolboxTokenCreate> {
    static override description = 'Create a fungible token'

    static override examples = [
        '<%= config.bin %> <%= command.id %>  toolbox token create --wizard',
        '<%= config.bin %> <%= command.id %> toolbox token create --name "My Token" --symbol "TOKEN" --decimals 2 --image ./image.png --mint-amount 1000000000',
    ]

    static override flags = {
        wizard: Flags.boolean({ description: 'Wizard mode', required: false }),
        name: Flags.string({ description: 'Name of the token', required: false, exclusive: ['wizard'] }),
        symbol: Flags.string({ description: 'Symbol of the token', required: false, exclusive: ['wizard'] }),
        decimals: Flags.integer({ description: 'Number of decimals the token has', required: false, exclusive: ['wizard'] }),
        description: Flags.string({ description: 'Description of the token', required: false, exclusive: ['wizard'] }),
        image: Flags.file({ description: 'Image of the token', required: false, exclusive: ['wizard'] }),
        mint: Flags.integer({ name: 'mint-amount', description: 'Amount of tokens to mint', required: false, exclusive: ['wizard'] }),
    }


    public async run() {
        const { args, flags } = await this.parse(ToolboxTokenCreate)

        const { umi } = this.context


        if (flags.wizard) {
            this.logSuccess(
                `--------------------------------
    
    Welcome to the Token Creator Wizard!

    This wizard will guide you through the process of creating a new token.                
                
--------------------------------`
            )


            const wizard = await createTokenPrompt()

            let imageUri
            let jsonUri

            if (wizard?.image) {
                imageUri = await imageUploader(umi, wizard.image)
            }

            // upload json

            jsonUri = await umi.uploader.uploadJson({
                name: wizard?.name,
                symbol: wizard?.symbol,
                description: wizard?.description,
                image: imageUri,
            })


            if (!jsonUri) {
                this.error('Missing required json')
            }

            this.createToken(umi, { name: wizard?.name, symbol: wizard?.symbol, description: wizard?.description, image: jsonUri, mintAmount: wizard?.mint })



        } else {

            if (!flags.name || !flags.symbol || !flags.description || !flags.image || !flags.mint) {
                throw ("Missing required flags")
            }

            const imageUri = await imageUploader(umi, flags.image)

            const jsonUri = await uploadJson(umi, {
                name: flags.name,
                symbol: flags.symbol,
                description: flags.description,
                image: imageUri,
            })

            if (!jsonUri) {
                this.error('Missing required json')
            }

            try {
                this.createToken(umi, { name: flags.name, symbol: flags.symbol, description: flags.description, image: jsonUri, mintAmount: flags.mint })
            } catch (error) {
                this.error(error as string)
            }


        }

    }

    private async createToken(umi: Umi, input: { name: string, symbol: string, description: string, image: string, decimals?: number, mintAmount: number }) {

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

        const createSpinner = ora('Creating token...').start()
        const result = await umiSendAndConfirmTransaction(umi, createFunigbleIx)
        createSpinner.succeed('Token created successfully')

        this.logSuccess(
            `--------------------------------
    Token created successfully
    Mint: ${mint.publicKey}
    Signature: ${base58.deserialize(result.transaction.signature as Uint8Array)[0]}
--------------------------------`
        )
    }
}
