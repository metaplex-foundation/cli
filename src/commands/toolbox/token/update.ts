import { Args, Flags } from '@oclif/core'

import { fetchDigitalAsset, fetchJsonMetadata, updateV1 } from '@metaplex-foundation/mpl-token-metadata'
import { publicKey, Umi } from '@metaplex-foundation/umi'
import ora from 'ora'
import umiSendAndConfirmTransaction from '../../../lib/umi/sendAndConfirm.js'
import imageUploader from '../../../lib/uploader/imageUploader.js'
import uploadJson from '../../../lib/uploader/uploadJson.js'
import { TransactionCommand } from '../../../TransactionCommand.js'


/* 
  Update Token Possibilities:

  1. Update a token via flags.


*/

export default class ToolboxTokenUpdate extends TransactionCommand<typeof ToolboxTokenUpdate> {
    static override description = 'Airdrop SOL to an address'

    static override examples = [
        '<%= config.bin %> <%= command.id %> toolbox token update <mintAddress> <flags>',
        '<%= config.bin %> <%= command.id %> toolbox token update <mintAddress> --name "New Name" --description "New Description" --image ./image.png',
    ]

    static override args = {
        mint: Args.string({ description: "Mint address of the token to be updated.", required: true })
    }

    static override flags = {
        image: Flags.file({ description: 'Image path for new token image.' }),
        name: Flags.string({ description: 'New name of the token.' }),
        description: Flags.string({ description: 'New description of the token' }),
        symbol: Flags.string({ description: 'New symbol of the token.' })
    }


    public async run() {
        const { args, flags } = await this.parse(ToolboxTokenUpdate)

        const { umi } = this.context

        this.logSuccess(
            `--------------------------------
    
    Token Update         
                
--------------------------------`
        )

        if (!flags.name && !flags.description && !flags.image && !flags.description && !flags.symbol) {
            this.error("Nothing to update, no flags selected.")
        }


        this.updateToken(umi, { mint: args.mint, name: flags.name, description: flags.description, image: flags.image, symbol: flags.symbol })

    }


    private async updateToken(umi: Umi, input: { mint: string, name?: string, description?: string, image?: string, symbol?: string }) {


        const originalToken = await fetchDigitalAsset(umi, publicKey(input.mint))

        const originalJsonMetadata = await fetchJsonMetadata(umi, originalToken.metadata.uri)

        const imageUploadSpinner = input.image && ora("Uploading Image...").start()
        const newImageUri = input.image && await imageUploader(umi, input.image)
        imageUploadSpinner && imageUploadSpinner.succeed("Image uploaded")

        const newMetadata = {
            ...originalJsonMetadata,
            name: input.name || originalJsonMetadata.name,
            description: input.description || originalJsonMetadata.description,
            symbol: input.symbol || originalJsonMetadata.symbol,
            image: newImageUri || originalJsonMetadata.image
        }

        const jsonUploadSpinner = ora("Uploading JSON file...s")
        const newMetadataUri = await uploadJson(umi, newMetadata);
        jsonUploadSpinner.succeed("Uploaded JSON")

        const updateTokenSpinner = ora("Updating Token...")
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
