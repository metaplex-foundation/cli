import { Args, Flags } from '@oclif/core'

import { addCollectionPlugin, AddCollectionPluginArgsPlugin, addPlugin, AddPluginArgsPlugin } from '@metaplex-foundation/mpl-core'
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
        let pluginData: PluginData | undefined
        let selectedPlugin: Plugin | undefined

        if (flags.wizard) {
            selectedPlugin = await pluginSelector({
                filter: flags.collection ? PluginFilterType.Collection : PluginFilterType.Asset,
                type: 'list',
                managedBy: PluginFilterType.Authority
            }) as Plugin

            console.log(selectedPlugin)
            pluginData = await pluginConfigurator([selectedPlugin])
            console.log(pluginData)
        }

        if (args.json) {
            pluginData = JSON.parse(fs.readFileSync(args.json, 'utf-8'))
        }

        if (!pluginData || !selectedPlugin) {
            throw new Error('Plugin data is required')
        }

        const plugin = Object.values(pluginData)[0] as AddPluginArgsPlugin | AddCollectionPluginArgsPlugin
        await this.addPlugin(args.id, plugin, { isCollection: flags.collection })
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
            transactionSpinner.succeed("Plugin added successfully")

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
