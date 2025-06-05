import {
    ConfigLineSettings,
    create,
    HiddenSettings
} from '@metaplex-foundation/mpl-core-candy-machine'
import { generateSigner, none, publicKey, Umi } from '@metaplex-foundation/umi'
import fs from 'node:fs'
import path from 'path'
import { TransactionCommand } from '../../TransactionCommand.js'
import createCandyMachinePrompt from '../../lib/cm/prompts/createCandyMachinePrompt.js'
import { Flags } from '@oclif/core'

export type CreateCandyMachineArgs = {
    collection: string,
    itemsAvailable: number,
    isMutable: boolean,
    configLineSettings?: ConfigLineSettings,
    hiddenSettings?: HiddenSettings,
}

export default class CmCreate extends TransactionCommand<typeof CmCreate> {
    static override description = `Create an MPL Core Candy Machine using 2 different methods:

    1. Interactive Wizard: Create a Candy Machine using the interactive wizard which guides you through the process.
       Example: mplx cm create --wizard

    2. Direct Creation: Create a Candy Machine by providing the required parameters directly.
       Example: mplx cm create --collection <collection_address> --items <number_of_items> --mutable
    `

    static override examples = [
        '$ mplx cm create --wizard',
        '$ mplx cm create --collection <collection_address> --items <number_of_items> --mutable',
    ]

    static override usage = 'cm create [FLAGS]'

    static override flags = {
        wizard: Flags.boolean({ 
            description: 'Use interactive wizard to create candy machine',
            required: false 
        }),
        collection: Flags.string({
            char: 'c',
            description: 'Collection address',
            exclusive: ['wizard'],
        }),
        items: Flags.integer({
            char: 'i',
            description: 'Number of items available',
            exclusive: ['wizard'],
        }),
        mutable: Flags.boolean({
            char: 'm',
            description: 'Whether the candy machine is mutable',
            default: true,
            exclusive: ['wizard'],
        }),
    }

    public async run() {
        const { flags } = await this.parse(CmCreate)
        const { umi, explorer } = this.context

        let candyMachineConfig: CreateCandyMachineArgs

        if (flags.wizard) {
            this.log(
                `--------------------------------
    
    Welcome to the Candy Machine Creator Wizard!

    This wizard will guide you through the process of creating a new candy machine.                
                
--------------------------------`
            )
            const results = await createCandyMachinePrompt()
            candyMachineConfig = results.config
        } else {
            // Validate required flags for direct creation
            if (!flags.collection) {
                throw new Error('Collection address is required when not using wizard mode')
            }
            if (!flags.items) {
                throw new Error('Number of items is required when not using wizard mode')
            }

            candyMachineConfig = {
                collection: flags.collection,
                itemsAvailable: flags.items,
                isMutable: flags.mutable ?? true,
                configLineSettings: undefined,
                hiddenSettings: undefined,
            }
        }

        // Save guard configuration to a JSON file if it exists
        if ('guardConfig' in candyMachineConfig) {
            const configDir = path.join(process.cwd(), 'config')
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true })
            }

            const configPath = path.join(configDir, 'guard-config.json')
            fs.writeFileSync(configPath, JSON.stringify((candyMachineConfig as any).guardConfig, null, 2))
            console.log(`\nGuard configuration saved to: ${configPath}`)
        }

        // Create the candy machine
        const candyMachine = generateSigner(umi)
        const tx = create(umi, {
            candyMachine,
            collection: publicKey(candyMachineConfig.collection),
            collectionUpdateAuthority: umi.identity,
            itemsAvailable: candyMachineConfig.itemsAvailable,
            isMutable: candyMachineConfig.isMutable,
            configLineSettings: candyMachineConfig.configLineSettings,
            hiddenSettings: candyMachineConfig.hiddenSettings,
        })

        // TODO: Send transaction and handle result
    }

    private async createCandyMachine(umi: Umi, { collection, itemsAvailable, isMutable, configLineSettings, hiddenSettings }: CreateCandyMachineArgs) {
        const candyMachine = generateSigner(umi)
        const tx = create(umi, {
            candyMachine,
            collection: publicKey(collection),
            collectionUpdateAuthority: umi.identity,
            itemsAvailable,
            isMutable,
            configLineSettings,
            hiddenSettings,
        })
    }

    private async createCandyGuard(umi: Umi, candyMachine: string) {
        return
    }
}