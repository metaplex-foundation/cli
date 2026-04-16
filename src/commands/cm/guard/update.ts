import {
    fetchCandyMachine,
    fetchCandyGuard,
    updateCandyGuard,
} from '@metaplex-foundation/mpl-core-candy-machine'
import { publicKey } from '@metaplex-foundation/umi'
import { Args, Flags } from '@oclif/core'
import { checkbox, input } from '@inquirer/prompts'
import ora from 'ora'
import { TransactionCommand } from '../../../TransactionCommand.js'
import { readCmConfig, writeCmConfig } from '../../../lib/cm/cm-utils.js'
import { candyGuardsSchema } from '../../../lib/cm/candyGuardsSchema.js'
import jsonGuardParser from '../../../lib/cm/jsonGuardParser.js'
import { CandyMachineConfig, RawGuardConfig } from '../../../lib/cm/types.js'
import promptSelector from '../../../prompts/promptSelector.js'
import umiSendAndConfirmTransaction from '../../../lib/umi/sendAndConfirm.js'

export default class CmGuardUpdate extends TransactionCommand<typeof CmGuardUpdate> {
    static override description = `Update the guards on a candy machine's candy guard

    Reads guard configuration from cm-config.json in the current directory.
    Use --wizard for an interactive setup process.
    The candy machine address is read from cm-config.json or provided via --address.
    `

    static override examples = [
        '$ mplx cm guard update',
        '$ mplx cm guard update <directory>',
        '$ mplx cm guard update --address <candy-machine-address>',
        '$ mplx cm guard update --wizard',
    ]

    static override usage = 'cm guard update [DIRECTORY] [FLAGS]'

    static override args = {
        directory: Args.string({
            description: 'The directory containing the cm-config.json file',
            required: false,
        }),
    }

    static override flags = {
        address: Flags.string({
            char: 'a',
            description: 'The address of the candy machine',
            required: false,
        }),
        wizard: Flags.boolean({
            description: 'Use interactive wizard to configure guards',
            required: false,
        }),
    }

    public async run(): Promise<unknown> {
        const { flags, args } = await this.parse(CmGuardUpdate)
        const { umi } = this.context
        const directory = args.directory

        // Resolve candy machine address
        let candyMachineAddress = flags.address
        let cmConfig: CandyMachineConfig | undefined

        try {
            cmConfig = readCmConfig(directory)
        } catch {
            // no config file found
        }

        if (!candyMachineAddress) {
            candyMachineAddress = cmConfig?.candyMachineId
        }

        if (!candyMachineAddress) {
            this.error('No candy machine address provided. Use --address or run from a directory with cm-config.json')
        }

        // Load guard configuration
        let guardConfig: CandyMachineConfig['config']['guardConfig']
        let groups: CandyMachineConfig['config']['groups']

        if (flags.wizard) {
            const result = await this.runWizard(cmConfig)
            guardConfig = result.guardConfig
            groups = result.groups

            // Save updated config if we have one
            if (cmConfig) {
                cmConfig.config.guardConfig = guardConfig
                cmConfig.config.groups = groups
                writeCmConfig(cmConfig, directory)
                this.log('Updated cm-config.json with new guard configuration')
            }
        } else {
            if (!cmConfig) {
                this.error('No cm-config.json found. Run from a directory with cm-config.json or use --wizard')
            }
            guardConfig = cmConfig.config.guardConfig
            groups = cmConfig.config.groups
        }

        if ((!guardConfig || Object.keys(guardConfig).length === 0) && (!groups || groups.length === 0)) {
            this.error('No guards or groups found in configuration. Nothing to update.')
        }

        // Parse guards using existing parser
        const parsedGuards = jsonGuardParser({
            name: '',
            config: {
                collection: '',
                itemsAvailable: 0,
                isMutable: false,
                isSequential: false,
                guardConfig,
                groups,
            }
        })

        // Fetch candy machine to find its candy guard
        const fetchSpinner = ora('Fetching candy machine...').start()
        let candyGuardAddress: string

        try {
            const candyMachine = await fetchCandyMachine(umi, publicKey(candyMachineAddress))

            if (candyMachine.mintAuthority === candyMachine.authority) {
                fetchSpinner.fail('Candy machine uses authority-only minting (no candy guard)')
                this.error('This candy machine does not have a candy guard. Guards can only be updated on candy machines with an associated candy guard.')
            }

            // The mint authority is the candy guard address
            candyGuardAddress = candyMachine.mintAuthority

            // Verify it's actually a candy guard
            await fetchCandyGuard(umi, publicKey(candyGuardAddress))
            fetchSpinner.succeed(`Found candy guard: ${candyGuardAddress}`)
        } catch (error) {
            if (error instanceof Error && error.message.includes('authority-only')) {
                throw error
            }
            fetchSpinner.fail('Failed to fetch candy machine or candy guard')
            this.error(`Failed: ${error instanceof Error ? error.message : String(error)}`)
        }

        // Update the candy guard
        const updateSpinner = ora('Updating candy guard...').start()

        try {
            const tx = updateCandyGuard(umi, {
                candyGuard: publicKey(candyGuardAddress),
                guards: parsedGuards.guards,
                groups: parsedGuards.groups,
            })

            await umiSendAndConfirmTransaction(umi, tx)
            updateSpinner.succeed('Candy guard updated successfully')
        } catch (error) {
            updateSpinner.fail('Failed to update candy guard')
            this.error(`Update failed: ${error instanceof Error ? error.message : String(error)}`)
        }

        // Log summary
        const globalGuards = guardConfig ? Object.keys(guardConfig as Record<string, unknown>) : []
        const groupLabels = groups ? groups.map(g => g.label) : []

        if (globalGuards.length > 0) {
            this.log(`Global guards: ${globalGuards.join(', ')}`)
        }
        if (groupLabels.length > 0) {
            this.log(`Guard groups: ${groupLabels.join(', ')}`)
        }

        this.logSuccess('Guard update complete!')

        return {
            candyMachineAddress,
            candyGuardAddress,
            guards: globalGuards,
            groups: groupLabels,
        }
    }

    private async runWizard(existingConfig?: CandyMachineConfig): Promise<{
        guardConfig: RawGuardConfig | undefined,
        groups: CandyMachineConfig['config']['groups']
    }> {
        this.log(
            `--------------------------------

    Candy Guard Update Wizard

    This wizard will guide you through configuring guards for your candy machine.
    Note: This will replace ALL existing guards with the new configuration.

--------------------------------`
        )

        function checkAbort(val: any) {
            if (typeof val === 'string' && val.trim().toLowerCase() === 'q') {
                console.log('Aborting wizard by user request.')
                process.exit(0)
            }
            if (Array.isArray(val) && val.includes('Quit')) {
                console.log('Aborting wizard by user request.')
                process.exit(0)
            }
        }

        // Show existing guards if available
        if (existingConfig) {
            const existingGuards = existingConfig.config.guardConfig
            const existingGroups = existingConfig.config.groups
            const hasExistingGuards = existingGuards && Object.keys(existingGuards as Record<string, unknown>).length > 0
            const hasExistingGroups = existingGroups && existingGroups.length > 0

            if (hasExistingGuards || hasExistingGroups) {
                this.log('\nCurrent guard configuration:')
                if (hasExistingGuards) {
                    this.log(`  Global guards: ${Object.keys(existingGuards as Record<string, unknown>).join(', ')}`)
                }
                if (hasExistingGroups) {
                    for (const group of existingGroups) {
                        this.log(`  Group "${group.label}": ${Object.keys(group.guards as Record<string, unknown>).join(', ')}`)
                    }
                }
                this.log('')
            }
        }

        const guardConfig: Record<string, any> = {}
        const groups: CandyMachineConfig['config']['groups'] = []

        const guardChoices = Object.entries(candyGuardsSchema).map(([guard]) => guard).sort()

        // Global guards
        const globalGuardsPrompt = await input({
            message: 'Do you want to configure global guards? (y/n or q to quit)',
            validate: () => true,
        })
        checkAbort(globalGuardsPrompt)

        if (globalGuardsPrompt.trim().toLowerCase() === 'y') {
            const selectedGlobalGuards: string[] = await checkbox({
                message: 'Select the guards to assign globally:',
                choices: [...guardChoices, 'Quit'],
                pageSize: 20,
                loop: false,
            })
            checkAbort(selectedGlobalGuards)

            for (const guard of selectedGlobalGuards) {
                console.log(`Configuring guard: ${guard}`)
                const answers: { [key: string]: string | number | boolean | any[] } = {}
                const promptItem = candyGuardsSchema[guard as keyof typeof candyGuardsSchema]
                for (const prompt of promptItem) {
                    const res = await promptSelector(prompt)
                    answers[prompt.name] = res as string | number | boolean
                }
                ;(guardConfig as any)[guard] = answers
            }
        }

        // Guard groups
        const enableGroupsPrompt = await input({
            message: 'Do you want to configure guard groups? (y/n or q to quit)',
            validate: () => true,
        })
        checkAbort(enableGroupsPrompt)

        if (enableGroupsPrompt.trim().toLowerCase() === 'y') {
            const numGroupsPrompt = await input({
                message: 'Enter the number of groups (or q to quit):',
                validate: () => true,
            })
            checkAbort(numGroupsPrompt)
            const numGroups = Number(numGroupsPrompt)

            for (let i = 0; i < numGroups; i++) {
                const groupName = await input({
                    message: `Enter the name of group ${i + 1} (max 6 chars, or q to quit):`,
                    validate: (value) => {
                        if (value === 'q') return true
                        if (value.length > 6) return 'Group label must be 6 characters or less'
                        if (!value) return 'Group name is required'
                        return true
                    },
                })
                checkAbort(groupName)

                const groupGuards: Record<string, any> = {}

                const selectedGuards: string[] = await checkbox({
                    message: `Select the guards to assign to group "${groupName}":`,
                    choices: [...guardChoices, 'Quit'],
                    pageSize: 20,
                    loop: false,
                })
                checkAbort(selectedGuards)

                for (const selectedGuard of selectedGuards) {
                    console.log(`Configuring guard: ${selectedGuard}`)
                    const answers: { [key: string]: string | number | boolean | any[] } = {}
                    const promptItem = candyGuardsSchema[selectedGuard as keyof typeof candyGuardsSchema]
                    for (const prompt of promptItem) {
                        const res = await promptSelector(prompt)
                        answers[prompt.name] = res as string | number | boolean
                    }
                    ;(groupGuards as any)[selectedGuard] = answers
                }

                groups.push({
                    label: groupName,
                    guards: groupGuards,
                })
            }
        }

        const hasGlobalGuards = Object.keys(guardConfig).length > 0
        const hasGroups = groups.length > 0

        if (!hasGlobalGuards && !hasGroups) {
            this.log('⚠️  Warning: No guards or groups configured. This will remove all existing guards from the candy machine.')
        }

        return {
            guardConfig: hasGlobalGuards ? guardConfig as RawGuardConfig : undefined,
            groups: hasGroups ? groups : undefined,
        }
    }
}
