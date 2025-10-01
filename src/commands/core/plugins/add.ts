import { Args, Flags } from '@oclif/core'

import { addCollectionPlugin, AddCollectionPluginArgsPlugin, addPlugin, AddPluginArgsPlugin, fetchAsset } from '@metaplex-foundation/mpl-core'
import { publicKey } from '@metaplex-foundation/umi'
import { readFileSync } from 'fs'
import ora from 'ora'
import { BaseCommand } from '../../../BaseCommand.js'
import { generateExplorerUrl } from '../../../explorers.js'
import { Plugin } from '../../../lib/types/pluginData.js'
import umiSendAndConfirmTransaction from '../../../lib/umi/sendAndConfirm.js'
import { txSignatureToString } from '../../../lib/util.js'
import pluginConfigurator from '../../../prompts/pluginInquirer.js'
import { PluginFilterType, pluginSelector } from '../../../prompts/pluginSelector.js'

export default class CorePluginsAdd extends BaseCommand<typeof CorePluginsAdd> {
    static override description = 'Add a plugin to an asset or collection'

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
        const { args, flags } = await this.parse(CorePluginsAdd)
        let plugin: AddPluginArgsPlugin | AddCollectionPluginArgsPlugin | undefined
        let selectedPlugin: Plugin | undefined

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

            plugin = Object.values(wizardPluginData)[0] as AddPluginArgsPlugin | AddCollectionPluginArgsPlugin

            // For validation, we'll use the first selected plugin
            selectedPlugin = selectedPlugins[0]
        }

        if (args.json) {
            const jsonData = JSON.parse(readFileSync(args.json, 'utf-8'))

            if (jsonData.length === 0) {
                throw new Error('Plugin data array is empty')
            }

            plugin = jsonData[0] as AddPluginArgsPlugin | AddCollectionPluginArgsPlugin
        }

        if (!plugin) {
            throw new Error('Plugin data is required')
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

        await this.addPlugin(args.id, plugin, {
            isCollection: flags.collection,
            collectionId
        })
    }

    private async addPlugin(asset: string, pluginData: AddPluginArgsPlugin | AddCollectionPluginArgsPlugin, options: { isCollection: boolean, collectionId?: string }) {
        const { umi, explorer } = this.context
        const { isCollection, collectionId } = options

        console.log("generating transaction")
        console.log({ pluginData })

        let addPluginIx = isCollection
            ? addCollectionPlugin(umi, {
                collection: publicKey(asset),
                plugin: pluginData as AddCollectionPluginArgsPlugin
            })
            : addPlugin(umi, {
                asset: publicKey(asset),
                collection: collectionId ? publicKey(collectionId) : undefined,
                plugin: pluginData as AddPluginArgsPlugin
            })

        const transactionSpinner = ora('Adding plugin...').start()
        try {
            const res = await umiSendAndConfirmTransaction(umi, addPluginIx)
            transactionSpinner.succeed(`Plugin added: ${asset}`)

            console.log(
                `--------------------------------\n
                Asset: ${asset}\n
                Signature: ${txSignatureToString(res.transaction.signature as Uint8Array)}\n
                Explorer: ${generateExplorerUrl(explorer, this.context.chain, txSignatureToString(res.transaction.signature as Uint8Array), 'transaction')}\n
                Core Explorer: https://core.metaplex.com/explorer/${asset}\n
                --------------------------------`
            )

            return res
        } catch (error: unknown) {
            transactionSpinner.fail(`Failed to add plugin: ${error instanceof Error ? error.message : 'Unknown error'}`)
            throw error
        }
    }
}
