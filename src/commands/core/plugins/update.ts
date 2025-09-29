import { Args, Flags } from '@oclif/core'

import { updateCollectionPlugin, updatePlugin, fetchAsset, fetchCollection } from '@metaplex-foundation/mpl-core'
import { publicKey } from '@metaplex-foundation/umi'
import fs from 'fs'
import ora from 'ora'
import { BaseCommand } from '../../../BaseCommand.js'
import { ExplorerType, generateExplorerUrl } from '../../../explorers.js'
import { Plugin, PluginData } from '../../../lib/types/pluginData.js'
import umiSendAndConfirmTransaction from '../../../lib/umi/sendAndConfirm.js'
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
        let pluginData: PluginData | undefined
        let selectedPlugin: Plugin | undefined

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
            pluginData = await pluginConfigurator(selectedPlugins)
            console.log(pluginData)
        }

        if (args.json) {
            pluginData = JSON.parse(fs.readFileSync(args.json, 'utf-8'))
        }

        if (!pluginData) {
            throw new Error('Plugin data is required')
        }

        const plugin = Object.values(pluginData)[0]
        await this.updatePlugin(args.id, plugin, { isCollection: flags.collection })
    }

    private async updatePlugin(assetOrCollection: string, pluginData: any, options: { isCollection: boolean, collectionId?: string }) {
        const { umi, explorer } = this.context
        const { isCollection, collectionId } = options

        console.log("generating transaction")
        console.log({ pluginData })

        let updatePluginIx = isCollection
            ? updateCollectionPlugin(umi, {
                collection: publicKey(assetOrCollection),
                plugin: pluginData
            })
            : updatePlugin(umi, {
                asset: publicKey(assetOrCollection),
                collection: collectionId ? publicKey(collectionId) : undefined,
                plugin: pluginData
            })

        const transactionSpinner = ora('Updating plugin...').start()
        try {
            const res = await umiSendAndConfirmTransaction(umi, updatePluginIx)
            transactionSpinner.succeed("Plugin updated successfully")

            console.log(
                `--------------------------------\n
                ${isCollection ? 'Collection' : 'Asset'}: ${assetOrCollection}\n
                Signature: ${txSignatureToString(res.transaction.signature as Uint8Array)}\n
                Explorer: ${generateExplorerUrl(explorer, this.context.chain, txSignatureToString(res.transaction.signature as Uint8Array), 'transaction')}\n
                Core Explorer: https://core.metaplex.com/explorer/${assetOrCollection}\n
                --------------------------------`
            )

            return res
        } catch (error: unknown) {
            transactionSpinner.fail(`Failed to update plugin: ${error instanceof Error ? error.message : 'Unknown error'}`)
            throw error
        }
    }
}