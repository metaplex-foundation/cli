import { Args, Flags } from '@oclif/core'

import { updateCollectionPlugin, updatePlugin, UpdatePluginArgsPlugin, UpdateCollectionPluginArgsPlugin, fetchAsset, fetchCollection } from '@metaplex-foundation/mpl-core'
import { publicKey, transactionBuilder } from '@metaplex-foundation/umi'
import { readFileSync } from 'fs'
import ora from 'ora'
import { BaseCommand } from '../../../BaseCommand.js'
import { Plugin } from '../../../lib/types/pluginData.js'
import umiSendAllTransactionsAndConfirm from '../../../lib/umi/sendAllTransactionsAndConfirm.js'
import { txSignatureToString } from '../../../lib/util.js'
import pluginConfigurator from '../../../prompts/pluginInquirer.js'
import { PluginFilterType, pluginSelector } from '../../../prompts/pluginSelector.js'

export default class CorePluginsUpdate extends BaseCommand<typeof CorePluginsUpdate> {
    static override description = 'Update a plugin on an asset or collection'

    static override examples = [
        '<%= config.bin %> <%= command.id %> <asset or collection public key> --wizard',
        '<%= config.bin %> <%= command.id %> <asset or collection public key> ./plugin.json',
    ]

    static override flags = {
        wizard: Flags.boolean({ description: 'Wizard mode', default: false }),
        collection: Flags.boolean({ description: 'Is this a collection\'s plugin', default: false }),
    }

    static override args = {
        id: Args.string({ description: 'asset or collection public key', required: true }),
        json: Args.file({ description: 'path to a plugin data JSON file', required: false }),
    }

    public async run() {
        const { args, flags } = await this.parse(CorePluginsUpdate)

        // Fetch current asset or collection to validate it exists
        const fetchSpinner = ora('Fetching current state...').start()
        try {
            if (flags.collection) {
                await fetchCollection(this.context.umi, publicKey(args.id))
            } else {
                await fetchAsset(this.context.umi, publicKey(args.id))
            }
            fetchSpinner.succeed('Successfully fetched current state')
        } catch (error) {
            fetchSpinner.fail(`Failed to fetch ${flags.collection ? 'collection' : 'asset'}: ${error instanceof Error ? error.message : 'Unknown error'}`)
            throw error
        }

        // Auto-detect collection ID if this is an asset operation
        let collectionId: string | undefined
        if (!flags.collection) {
            try {
                const asset = await fetchAsset(this.context.umi, publicKey(args.id))

                if (asset.updateAuthority.type === 'Collection') {
                    collectionId = asset.updateAuthority.address
                }
            } catch (error) {
                throw new Error('Unable to fetch asset')
            }
        }

        if (flags.wizard) {
            const selectedPlugins = await pluginSelector({
                filter: flags.collection ? PluginFilterType.Collection : PluginFilterType.Asset,
                type: 'list',
                managedBy: PluginFilterType.Authority
            }) as Plugin[]

            if (selectedPlugins.length === 0) {
                throw new Error('At least one plugin must be selected')
            }

            console.log(selectedPlugins)
            const wizardPluginData = await pluginConfigurator(selectedPlugins)
            console.log(wizardPluginData)

            const pluginsArray = Object.values(wizardPluginData) as (UpdatePluginArgsPlugin | UpdateCollectionPluginArgsPlugin)[]
            await this.updatePluginsBatch(args.id, pluginsArray, {
                isCollection: flags.collection,
                collectionId
            })
            return
        }

        if (args.json) {
            const jsonData = JSON.parse(readFileSync(args.json, 'utf-8'))

            if (!Array.isArray(jsonData)) {
                throw new Error('Plugin JSON must be an array')
            }

            if (jsonData.length === 0) {
                throw new Error('Plugin data array is empty')
            }

            await this.updatePluginsBatch(args.id, jsonData as (UpdatePluginArgsPlugin | UpdateCollectionPluginArgsPlugin)[], {
                isCollection: flags.collection,
                collectionId
            })
            return
        }

        throw new Error('Either --wizard flag or JSON file argument is required')
    }


    private async updatePluginsBatch(assetOrCollection: string, pluginsData: (UpdatePluginArgsPlugin | UpdateCollectionPluginArgsPlugin)[], options: { isCollection: boolean, collectionId?: string }) {
        const { umi, explorer } = this.context
        const { isCollection, collectionId } = options

        console.log("generating batch transaction")
        console.log(`Updating ${pluginsData.length} plugins`)

        // Build a single transaction with all plugin instructions
        let transaction = transactionBuilder()

        for (const pluginData of pluginsData) {
            const updatePluginIx = isCollection
                ? updateCollectionPlugin(umi, {
                    collection: publicKey(assetOrCollection),
                    plugin: pluginData as UpdateCollectionPluginArgsPlugin
                })
                : updatePlugin(umi, {
                    asset: publicKey(assetOrCollection),
                    collection: collectionId ? publicKey(collectionId) : undefined,
                    plugin: pluginData as UpdatePluginArgsPlugin
                })

            transaction = transaction.add(updatePluginIx)
        }

        // Split the transaction if it's too large
        const transactions = transaction.unsafeSplitByTransactionSize(umi)

        const transactionSpinner = ora(`Updating ${pluginsData.length} plugins${transactions.length > 1 ? ` in ${transactions.length} transactions` : ''}...`).start()
        try {
            const results = await umiSendAllTransactionsAndConfirm(umi, transactions, undefined, `Updating ${pluginsData.length} plugins${transactions.length > 1 ? ` in ${transactions.length} transactions` : ''}...`)

            transactionSpinner.succeed(`Successfully updated ${pluginsData.length} plugins on ${isCollection ? 'collection' : 'asset'}: ${assetOrCollection}${transactions.length > 1 ? ` in ${transactions.length} transactions` : ''}`)

            const signatures = results
                .filter(r => r.transaction.signature !== null && typeof r.transaction.signature !== 'string')
                .map(r => txSignatureToString(r.transaction.signature as Uint8Array))
                .join(', ')

            console.log(
                `--------------------------------
${isCollection ? 'Collection' : 'Asset'}: ${assetOrCollection}
Plugins Updated: ${pluginsData.length}
Transactions: ${transactions.length}
Signatures: ${signatures}
Core Explorer: https://core.metaplex.com/explorer/${assetOrCollection}
--------------------------------`
            )

            return results[0]
        } catch (error: unknown) {
            transactionSpinner.fail(`Failed to update plugins: ${error instanceof Error ? error.message : 'Unknown error'}`)
            throw error
        }
    }
}