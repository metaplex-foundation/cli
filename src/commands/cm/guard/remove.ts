import { input } from '@inquirer/prompts'
import {
    fetchCandyMachine,
    fetchCandyGuard,
    unwrap,
} from '@metaplex-foundation/mpl-core-candy-machine'
import { publicKey } from '@metaplex-foundation/umi'
import { Flags } from '@oclif/core'
import ora from 'ora'
import { TransactionCommand } from '../../../TransactionCommand.js'
import { terminalColors } from '../../../lib/StandardColors.js'
import { readCmConfig } from '../../../lib/cm/cm-utils.js'
import umiSendAndConfirmTransaction from '../../../lib/umi/sendAndConfirm.js'

export default class CmGuardRemove extends TransactionCommand<typeof CmGuardRemove> {
    static override description = `Remove (unwrap) the candy guard from a candy machine

    This changes the mint authority back to the candy machine authority,
    meaning minting will require the authority to sign instead of using guards.
    The candy guard account is NOT deleted and can be re-attached later.
    Use 'cm guard delete' to permanently delete the candy guard account.
    `

    static override examples = [
        '$ mplx cm guard remove',
        '$ mplx cm guard remove --address <candy-machine-address>',
        '$ mplx cm guard remove --force',
    ]

    static override usage = 'cm guard remove [FLAGS]'

    static override flags = {
        address: Flags.string({
            char: 'a',
            description: 'The address of the candy machine',
            required: false,
        }),
        force: Flags.boolean({
            description: 'Skip confirmation prompt',
            default: false,
        }),
    }

    public async run(): Promise<unknown> {
        const { flags } = await this.parse(CmGuardRemove)
        const { umi } = this.context

        // Resolve candy machine address
        let candyMachineAddress = flags.address

        if (!candyMachineAddress) {
            try {
                const config = readCmConfig()
                candyMachineAddress = config.candyMachineId
            } catch {
                // no config file found
            }
        }

        if (!candyMachineAddress) {
            this.error('No candy machine address provided. Use --address or run from a directory with cm-config.json')
        }

        // Fetch candy machine to find its candy guard
        const fetchSpinner = ora('Fetching candy machine...').start()
        let candyGuardAddress: string
        let candyMachine

        try {
            candyMachine = await fetchCandyMachine(umi, publicKey(candyMachineAddress))
        } catch (error) {
            fetchSpinner.fail('Failed to fetch candy machine')
            this.error(`Failed: ${error instanceof Error ? error.message : String(error)}`)
        }

        if (candyMachine.mintAuthority === candyMachine.authority) {
            fetchSpinner.fail('Candy machine uses authority-only minting')
            this.error('This candy machine uses authority-only minting and has no candy guard attached. Nothing to remove.')
        }

        candyGuardAddress = candyMachine.mintAuthority

        try {
            // Verify it's actually a candy guard
            await fetchCandyGuard(umi, publicKey(candyGuardAddress))
            fetchSpinner.succeed(`Found candy guard: ${candyGuardAddress}`)
        } catch (error) {
            fetchSpinner.fail('Failed to fetch candy guard')
            this.error(`Failed: ${error instanceof Error ? error.message : String(error)}`)
        }

        // Confirmation
        if (!flags.force) {
            this.log(`\n${terminalColors.BgRed}${terminalColors.FgWhite}You are about to remove the candy guard from this candy machine${terminalColors.FgDefault}${terminalColors.BgDefault}`)
            this.log(`Candy machine: ${candyMachineAddress}`)
            this.log(`Candy guard:   ${candyGuardAddress}`)
            this.log(`\nAfter removal, minting will require the authority to sign directly.`)
            this.log(`The candy guard account will still exist and can be re-attached.\n`)

            await input({
                message: `Type 'yes-remove' to confirm`,
                validate: (val) => {
                    if (val === 'yes-remove') return true
                    return 'Please type "yes-remove" to confirm'
                }
            })
        }

        // Unwrap the candy guard
        const unwrapSpinner = ora('Removing candy guard...').start()

        try {
            const tx = unwrap(umi, {
                candyGuard: publicKey(candyGuardAddress),
                candyMachine: publicKey(candyMachineAddress),
            })

            await umiSendAndConfirmTransaction(umi, tx)
            unwrapSpinner.succeed('Candy guard removed successfully')
        } catch (error) {
            unwrapSpinner.fail('Failed to remove candy guard')
            this.error(`Remove failed: ${error instanceof Error ? error.message : String(error)}`)
        }

        this.log(`Mint authority has been returned to the candy machine authority.`)
        this.logSuccess('Candy guard removed!')

        return {
            candyMachineAddress,
            candyGuardAddress,
        }
    }
}
