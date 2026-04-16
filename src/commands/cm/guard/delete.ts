import { input } from '@inquirer/prompts'
import {
    fetchCandyGuard,
    deleteCandyGuard,
} from '@metaplex-foundation/mpl-core-candy-machine'
import { publicKey } from '@metaplex-foundation/umi'
import { Flags } from '@oclif/core'
import ora from 'ora'
import { TransactionCommand } from '../../../TransactionCommand.js'
import { terminalColors } from '../../../lib/StandardColors.js'
import umiSendAndConfirmTransaction from '../../../lib/umi/sendAndConfirm.js'

export default class CmGuardDelete extends TransactionCommand<typeof CmGuardDelete> {
    static override description = `Delete a candy guard account and reclaim rent

    The candy guard must first be removed (unwrapped) from the candy machine
    before it can be deleted. Use 'cm guard remove' first if needed.

    ⚠️  WARNING: This permanently deletes the candy guard account. This cannot be undone.
    `

    static override examples = [
        '$ mplx cm guard delete --address <candy-guard-address>',
        '$ mplx cm guard delete --address <candy-guard-address> --force',
    ]

    static override usage = 'cm guard delete [FLAGS]'

    static override flags = {
        address: Flags.string({
            char: 'a',
            description: 'The address of the candy guard to delete',
            required: true,
        }),
        force: Flags.boolean({
            description: 'Skip confirmation prompt',
            default: false,
        }),
    }

    public async run(): Promise<unknown> {
        const { flags } = await this.parse(CmGuardDelete)
        const { umi } = this.context

        const candyGuardAddress = flags.address

        // Verify the candy guard exists
        const verifySpinner = ora('Verifying candy guard...').start()

        try {
            await fetchCandyGuard(umi, publicKey(candyGuardAddress))
            verifySpinner.succeed(`Found candy guard: ${candyGuardAddress}`)
        } catch (error) {
            verifySpinner.fail('Candy guard not found')
            this.error(`The account at ${candyGuardAddress} does not exist or is not a valid candy guard.`)
        }

        // Confirmation
        if (!flags.force) {
            this.log(`\n${terminalColors.BgRed}${terminalColors.FgWhite}You are about to permanently delete this candy guard account${terminalColors.FgDefault}${terminalColors.BgDefault}`)
            this.log(`Candy guard: ${candyGuardAddress}`)
            this.log(`\nThis action cannot be undone. The rent will be returned to your wallet.\n`)

            await input({
                message: `Type 'yes-delete' to confirm`,
                validate: (val) => {
                    if (val === 'yes-delete') return true
                    return 'Please type "yes-delete" to confirm'
                }
            })
        }

        // Delete the candy guard
        const deleteSpinner = ora('Deleting candy guard...').start()

        try {
            const tx = deleteCandyGuard(umi, {
                candyGuard: publicKey(candyGuardAddress),
            })

            await umiSendAndConfirmTransaction(umi, tx)
            deleteSpinner.succeed('Candy guard deleted successfully')
        } catch (error) {
            deleteSpinner.fail('Failed to delete candy guard')
            this.error(`Delete failed: ${error instanceof Error ? error.message : String(error)}`)
        }

        this.log(`Rent has been returned to your wallet.`)
        this.logSuccess('Candy guard deleted!')

        return {
            candyGuardAddress,
        }
    }
}
