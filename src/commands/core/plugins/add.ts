import { Args, Flags } from '@oclif/core'

import { BaseCommand } from '../../../BaseCommand.js'
import { Plugin, PluginData } from '../../../lib/types/pluginData.js'
import { PluginFilterType, pluginSelector } from '../../../prompts/pluginSelector.js'
import pluginConfigurator from '../../../prompts/pluginInquirer.js'
import fs from 'fs'
import { addCollectionPlugin, AddCollectionPluginArgs, AddCollectionPluginArgsPlugin, addPlugin, AddPluginArgs, AddPluginArgsPlugin } from '@metaplex-foundation/mpl-core'
import { publicKey } from '@metaplex-foundation/umi'
import umiSendAndConfirmTransaction from '../../../lib/umi/sendAndConfirm.js'
import ora from 'ora'
import { base58 } from '@metaplex-foundation/umi/serializers'
import { ExplorerType, generateExplorerUrl } from '../../../explorers.js'
import { txSignatureToString } from '../../../lib/util.js'

export default class CollectionCreate extends BaseCommand<typeof CollectionCreate> {
    static override description = 'Add a plugin to an asset or collection'

    static override examples = [
        '<%= config.bin %> <%= command.id %> <asset or collection public key> --wizard',
        '<%= config.bin %> <%= command.id %> <asset or collection public key> ./plugin.json',
    ]

    static override flags = {
        wizard: Flags.boolean({ description: 'Wizard mode', default: false }),
    }

    static override args = {
        id: Args.string({ description: 'asset or collection public key', required: true }),
        json: Args.file({ description: 'path to a plugin data JSON file' }),
    }

    public async run() {
        const { args, flags } = await this.parse(CollectionCreate)
        const { umi, explorer } = this.context
        const isCollection = false
        let pluginData: PluginData | undefined
        let selectedPlugin: Plugin | undefined

        if (flags.wizard) {
            selectedPlugin = await pluginSelector({
                filter: isCollection ? PluginFilterType.Collection : PluginFilterType.Asset,
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
        await this.addPlugin(args.id, plugin, { isCollection })
    }

await this.addPlugin(args.id, plugin, { isCollection, collectionId: undefined })
        const { umi, explorer } = this.context

        if (!pluginData) {
            throw new Error('Plugin data is required')
        }

        console.log("generating transaction")
        console.log({pluginData})
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
                // rest of success handling
            } catch (error) {
                transactionSpinner.fail(`Failed to add plugin: ${error.message}`)
                throw error
            }
        console.log(
            `--------------------------------\n
      Asset: ${asset}\n
      Signature: ${txSignatureToString(res.transaction.signature as Uint8Array)}\n
      Explorer: ${generateExplorerUrl(explorer as ExplorerType, txSignatureToString(res.transaction.signature as Uint8Array), 'transaction')}\n
      Core Explorer: https://core.metaplex.com/explorer/${asset}\n
    --------------------------------`
        )

    
    }
}
