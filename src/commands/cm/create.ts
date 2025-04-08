import { Flags } from '@oclif/core'
import fs from 'node:fs'
import ora from 'ora'
import { TransactionCommand } from '../../TransactionCommand.js'
import umiAirdrop from '../../lib/toolbox/airdrop.js'
import { generateSigner, none, Umi } from '@metaplex-foundation/umi'
import { 
    ConfigLineSettings, 
    create, 
    createCandyGuard, 
    defaultCandyGuardNames, 
    DefaultGuardSetMintArgs, 
    emptyDefaultGuardSetArgs, 
    HiddenSettings, 
    parseMintArgs
} from '@metaplex-foundation/mpl-core-candy-machine'
import { publicKey } from '@metaplex-foundation/umi'
import inquirer from 'inquirer'
import { guardPrompts as importedGuardPrompts } from '../../lib/cm/prompts/candyGuardPromps.js'
import path from 'path'

export type CreateCandyMachineArgs = {
    collection: string,
    itemsAvailable: number,
    isMutable: boolean,
    configLineSettings: ConfigLineSettings,
    hiddenSettings: HiddenSettings,
}

export default class CmCreate extends TransactionCommand<typeof CmCreate> {
    static override description = `Create an MPL Core Candy Machine.`

    static override examples = [
        '<%= config.bin %> <%= command.id %> --name Cool Asset --uri https://example.com/metadata.json',
        '<%= config.bin %> <%= command.id %> --files --image ./asset/image.png --json ./asset/metadata.json',
        '<%= config.bin %> <%= command.id %> --directory ./assets',
    ]

    static override usage = 'cm create [FLAGS]'

    static override flags = {
        // collection: Flags.string({
        //     char: 'c',
        //     description: 'Collection address',
        //     required: true,
        // }),
        // items: Flags.integer({
        //     char: 'i',
        //     description: 'Number of items available',
        //     required: true,
        // }),
        // mutable: Flags.boolean({
        //     char: 'm',
        //     description: 'Whether the candy machine is mutable',
        //     default: true,
        // }),
    }

    public async run() {
        const { flags } = await this.parse(CmCreate)
        const { umi, explorer } = this.context

        // Guard configuration
        const guardConfig: Partial<DefaultGuardSetMintArgs> = {}
        const guardChoices = Object.entries(importedGuardPrompts).map(([guard, prompts]) => ({
            name: guard,
            value: guard,
            checked: false
        }))

        const { selectedGuards } = await inquirer.prompt<{ selectedGuards: string[] }>([
            {
                type: 'checkbox',
                name: 'selectedGuards',
                message: 'Select guards to enable:',
                choices: guardChoices,
                pageSize: 20,
                loop: false,
            },
        ])

        for (const guard of selectedGuards) {
            console.log(`Configuring guard: ${guard}`)
            const prompts = importedGuardPrompts[guard as keyof typeof importedGuardPrompts]
            if (prompts) {
                const answers = await inquirer.prompt<Record<string, any>>(prompts as any)
                guardConfig[guard as keyof DefaultGuardSetMintArgs] = answers
            }
        }

        // Save guard configuration to a JSON file
        const configDir = path.join(process.cwd(), 'config')
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true })
        }

        const configPath = path.join(configDir, 'guard-config.json')
        fs.writeFileSync(configPath, JSON.stringify(guardConfig, null, 2))
        console.log(`\nGuard configuration saved to: ${configPath}`)
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