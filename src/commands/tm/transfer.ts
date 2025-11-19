import { Args } from '@oclif/core'
import {
    fetchDigitalAsset,
    transferV1,
    TokenStandard,
    findTokenRecordPda
} from '@metaplex-foundation/mpl-token-metadata'
import {
    publicKey,
    unwrapOptionRecursively,
} from '@metaplex-foundation/umi'
import { findAssociatedTokenPda } from '@metaplex-foundation/mpl-toolbox'
import ora from 'ora'
import { TransactionCommand } from '../../TransactionCommand.js'
import { txSignatureToString } from '../../lib/util.js'
import { generateExplorerUrl } from '../../explorers.js'
import { TOKEN_AUTH_RULES_ID } from '../../constants.js'

export default class TmTransfer extends TransactionCommand<typeof TmTransfer> {
    static override description = 'Transfer an MPL Token Metadata NFT to a new owner. Automatically detects pNFTs and includes ruleset if present.'

    static override examples = [
        '$ mplx tm transfer <mintAddress> <destinationAddress>',
        '$ mplx tm transfer EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v 7BgBvyjrZX1YKz4oh9mjb8ZScatkkwb8DzFx7LoiVkM3',
    ]

    static override usage = 'tm transfer [ARGS]'

    static override args = {
        mint: Args.string({ description: 'Mint address of the NFT to transfer', required: true }),
        destination: Args.string({ description: 'Destination wallet address', required: true }),
    }

    public async run(): Promise<unknown> {
        const { args } = await this.parse(TmTransfer)
        const { umi, explorer, chain } = this.context

        this.log(
            `--------------------------------

    NFT Transfer

--------------------------------`
        )

        // Fetch the digital asset to determine if it's a pNFT
        const fetchSpinner = ora('Fetching NFT data...').start()
        const asset = await fetchDigitalAsset(umi, publicKey(args.mint)).catch((err) => {
            fetchSpinner.fail('Failed to fetch NFT data')
            throw err
        })
        fetchSpinner.succeed(`NFT data fetched: ${asset.metadata.name}`)

        const isPnft = unwrapOptionRecursively(asset.metadata.tokenStandard) === TokenStandard.ProgrammableNonFungible
        const destinationOwner = publicKey(args.destination)

        // Build transfer instruction
        const transferSpinner = ora('Transferring NFT...').start()

        let transferIx

        if (isPnft) {
            // For pNFTs, we need to include token records and authorization rules
            const sourceTokenRecord = findTokenRecordPda(umi, {
                mint: asset.publicKey,
                token: findAssociatedTokenPda(umi, {
                    mint: asset.publicKey,
                    owner: umi.identity.publicKey,
                })[0],
            })

            const destinationToken = findAssociatedTokenPda(umi, {
                mint: asset.publicKey,
                owner: destinationOwner,
            })

            const destinationTokenRecord = findTokenRecordPda(umi, {
                mint: asset.publicKey,
                token: destinationToken[0],
            })

            // Check if the pNFT has a ruleset
            const ruleSet = unwrapOptionRecursively(asset.metadata.programmableConfig)?.ruleSet

            if (ruleSet) {
                this.log(`Ruleset detected: ${ruleSet}`)
            }

            transferIx = transferV1(umi, {
                mint: asset.publicKey,
                authority: umi.identity,
                tokenOwner: umi.identity.publicKey,
                destinationOwner,
                destinationToken: destinationToken[0],
                tokenStandard: TokenStandard.ProgrammableNonFungible,
                tokenRecord: sourceTokenRecord,
                destinationTokenRecord,
                authorizationRules: ruleSet ? ruleSet : undefined,
                authorizationRulesProgram: ruleSet ? TOKEN_AUTH_RULES_ID : undefined,
                authorizationData: undefined,
            })
        } else {
            // For regular NFTs, use simpler transfer
            transferIx = transferV1(umi, {
                mint: asset.publicKey,
                authority: umi.identity,
                tokenOwner: umi.identity.publicKey,
                destinationOwner,
                tokenStandard: unwrapOptionRecursively(asset.metadata.tokenStandard) || TokenStandard.NonFungible
            })
        }

        const result = await transferIx.sendAndConfirm(umi).catch((err) => {
            transferSpinner.fail('Failed to transfer NFT')
            throw err
        })

        transferSpinner.succeed('NFT transferred successfully!')

        const signature = txSignatureToString(result.signature as Uint8Array)
        this.logSuccess(
            `--------------------------------
    NFT: ${asset.metadata.name}
    Mint: ${args.mint}
    Destination: ${args.destination}
    Signature: ${signature}
    Explorer: ${generateExplorerUrl(explorer, chain, signature, 'transaction')}
--------------------------------`
        )

        return {
            mint: args.mint,
            destination: args.destination,
            signature,
        }
    }
}
