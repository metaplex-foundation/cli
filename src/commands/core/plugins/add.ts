import { Args, Flags } from '@oclif/core'

import { addCollectionPlugin, AddCollectionPluginArgsPlugin, addPlugin, AddPluginArgsPlugin } from '@metaplex-foundation/mpl-core'
import { publicKey, transactionBuilder } from '@metaplex-foundation/umi'
import { readFileSync } from 'fs'
import ora from 'ora'
import { BaseCommand } from '../../../BaseCommand.js'
import { generateCoreExplorerUrl } from '../../../explorers.js'
import resolveCoreAccount from '../../../lib/core/fetch/resolveCoreAccount.js'
import { Plugin } from '../../../lib/types/pluginData.js'
import umiSendAllTransactionsAndConfirm from '../../../lib/umi/sendAllTransactionsAndConfirm.js'
import { txSignatureToString } from '../../../lib/util.js'
import pluginConfigurator from '../../../prompts/pluginInquirer.js'
import { PluginFilterType, pluginSelector } from '../../../prompts/pluginSelector.js'

export default class CorePluginsAdd extends BaseCommand<typeof CorePluginsAdd> {
    static override description = 'Add a plugin to an asset or collection'

    static override examples = [
        '<%= config.bin %> <%= command.id %> <asset or collection public key> --wizard',
        '<%= config.bin %> <%= command.id %> <asset or collection public key> ./plugin.json',
        '<%= config.bin %> <%= command.id %> <collection public key> ./plugin.json --collection',
    ]

    static override flags = {
        wizard: Flags.boolean({ description: 'Wizard mode', default: false }),
        collection: Flags.boolean({
            description: 'Treat the address as a collection (auto-detected if omitted)',
            default: false,
        }),
    }

    static override args = {
        id: Args.string({ description: 'asset or collection public key', required: true }),
        json: Args.file({ description: 'path to a plugin data JSON file', required: false }),
    }

    public async run(): Promise<unknown> {
        const { args, flags } = await this.parse(CorePluginsAdd)

        const resolveSpinner = ora('Resolving asset or collection...').start()
        let isCollection: boolean
        let collectionId: string | undefined
        try {
            const resolved = await resolveCoreAccount(this.context.umi, args.id, {
                forceCollection: flags.collection,
            })
            isCollection = resolved.isCollection
            collectionId = resolved.collectionId
            resolveSpinner.succeed(`Resolved as ${isCollection ? 'collection' : 'asset'}`)
        } catch (error) {
            resolveSpinner.fail(error instanceof Error ? error.message : 'Failed to resolve address')
            throw error
        }

        if (flags.wizard) {
            const selectedPlugins = await pluginSelector({
                filter: isCollection ? PluginFilterType.Collection : PluginFilterType.Asset,
                type: 'list',
                managedBy: PluginFilterType.Authority
            }) as Plugin[]

            if (selectedPlugins.length === 0) {
                throw new Error('At least one plugin must be selected')
            }

            const wizardPluginData = await pluginConfigurator(selectedPlugins)

            const pluginsArray = Object.values(wizardPluginData) as (AddPluginArgsPlugin | AddCollectionPluginArgsPlugin)[]
            return await this.addPluginsBatch(args.id, pluginsArray, {
                isCollection,
                collectionId
            })
        }

        if (args.json) {
            const jsonData = JSON.parse(readFileSync(args.json, 'utf-8'))

            if (!Array.isArray(jsonData)) {
                throw new Error('Plugin JSON must be an array')
            }

            if (jsonData.length === 0) {
                throw new Error('Plugin data array is empty')
            }

            return await this.addPluginsBatch(args.id, jsonData as (AddPluginArgsPlugin | AddCollectionPluginArgsPlugin)[], {
                isCollection,
                collectionId
            })
        }

        throw new Error('Either --wizard flag or JSON file argument is required')
    }


    private async addPluginsBatch(asset: string, pluginsData: (AddPluginArgsPlugin | AddCollectionPluginArgsPlugin)[], options: { isCollection: boolean, collectionId?: string }): Promise<unknown> {
        const { umi } = this.context
        const { isCollection, collectionId } = options

        let transaction = transactionBuilder()

        for (const pluginData of pluginsData) {
            const addPluginIx = isCollection
                ? addCollectionPlugin(umi, {
                    collection: publicKey(asset),
                    plugin: pluginData as AddCollectionPluginArgsPlugin
                })
                : addPlugin(umi, {
                    asset: publicKey(asset),
                    collection: collectionId ? publicKey(collectionId) : undefined,
                    plugin: pluginData as AddPluginArgsPlugin
                })

            transaction = transaction.add(addPluginIx)
        }

        const transactions = transaction.unsafeSplitByTransactionSize(umi)

        const transactionSpinner = ora(`Adding ${pluginsData.length} plugins${transactions.length > 1 ? ` in ${transactions.length} transactions` : ''}...`).start()
        try {
            const results = await umiSendAllTransactionsAndConfirm(umi, transactions, undefined, `Adding ${pluginsData.length} plugins${transactions.length > 1 ? ` in ${transactions.length} transactions` : ''}...`)

            transactionSpinner.succeed(`Successfully added ${pluginsData.length} plugins to ${isCollection ? 'collection' : 'asset'}: ${asset}${transactions.length > 1 ? ` in ${transactions.length} transactions` : ''}`)

            const signatures = results
                .filter(r => r.transaction.signature !== null && typeof r.transaction.signature !== 'string')
                .map(r => txSignatureToString(r.transaction.signature as Uint8Array))
                .join(', ')

            this.log(
                `--------------------------------
${isCollection ? 'Collection' : 'Asset'}: ${asset}
Plugins Added: ${pluginsData.length}
Transactions: ${transactions.length}
Signatures: ${signatures}
Core Explorer: ${generateCoreExplorerUrl(this.context.chain, asset)}
--------------------------------`
            )

            return {
                asset,
                pluginsAdded: pluginsData.length,
                transactions: transactions.length,
                signatures: signatures.split(', ').filter(Boolean),
                coreExplorer: generateCoreExplorerUrl(this.context.chain, asset),
            }
        } catch (error: unknown) {
            transactionSpinner.fail(`Failed to add plugins: ${error instanceof Error ? error.message : 'Unknown error'}`)
            throw error
        }
    }
}
