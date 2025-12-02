import { 
  safeFetchAddressLookupTable
} from '@metaplex-foundation/mpl-toolbox'
import { isPublicKey, isSome, publicKey } from '@metaplex-foundation/umi'
import { Args, Flags } from '@oclif/core'
import ora from 'ora'

import { BaseCommand } from '../../../BaseCommand.js'

const formatLutDisplay = (
    lutAddress: string,
    authority: string | null,
    addresses: string[],
    deactivationSlot: bigint,
    lastExtendedSlot: bigint,
    verbose: boolean
) => {
    let output = `--------------------------------
Address Lookup Table Details
LUT Address: ${lutAddress}
Authority: ${authority || 'None'}
Total Addresses: ${addresses.length}`

    if (verbose) {
        output += `
Deactivation Slot: ${deactivationSlot === 0n ? 'Not deactivated' : deactivationSlot.toString()}
Last Extended Slot: ${lastExtendedSlot.toString()}`
    }

    if (addresses.length > 0) {
        output += '\n\nAddresses in Table:'
        addresses.forEach((addr, index) => {
            output += `\n  ${(index + 1).toString().padStart(3)}. ${addr}`
        })
    } else {
        output += '\n\nNo addresses in this lookup table.'
    }

    output += '\n--------------------------------'
    return output
}

export default class ToolboxLutFetch extends BaseCommand<typeof ToolboxLutFetch> {
    static override description = 'Fetch and display the contents of an Address Lookup Table (LUT)'

    static override args = {
        address: Args.string({ 
            description: 'The address of the LUT to fetch', 
            required: true 
        }),
    }

    static override flags = {
        ...BaseCommand.flags,
        json: Flags.boolean({
            description: 'Output in JSON format',
            required: false,
        }),
        verbose: Flags.boolean({
            description: 'Show additional details (deactivation slot, last extended slot)',
            required: false,
        }),
    }

    static override examples = [
        '<%= config.bin %> <%= command.id %> <lutAddress>',
        '<%= config.bin %> <%= command.id %> <lutAddress> --json',
        '<%= config.bin %> <%= command.id %> <lutAddress> --verbose',
    ]

    static override usage = 'toolbox lut fetch <ADDRESS>'

    private validateAddress(address: string): void {
        if (!isPublicKey(address)) {
            throw new Error(`Invalid LUT address: ${address}`)
        }
    }

    public async run() {
        const { args, flags } = await this.parse(ToolboxLutFetch)
        const { umi } = this.context

        this.validateAddress(args.address)
        const lutAddress = publicKey(args.address)

        const spinner = ora('Fetching Address Lookup Table...').start()

        try {
            // Fetch the LUT account
            const lut = await safeFetchAddressLookupTable(umi, lutAddress)

            if (!lut) {
                spinner.fail('Address Lookup Table not found')
                throw new Error(`No Address Lookup Table found at address: ${args.address}`)
            }

            spinner.succeed('Address Lookup Table fetched successfully!')

            // Extract data
            const authorityStr = isSome(lut.authority) ? lut.authority.value.toString() : null
            const addressStrings = lut.addresses.map(addr => addr.toString())

            // Output based on format preference
            if (flags.json) {
                const jsonOutput = {
                    address: lutAddress.toString(),
                    authority: authorityStr,
                    addresses: addressStrings,
                    deactivationSlot: lut.deactivationSlot.toString(),
                    lastExtendedSlot: lut.lastExtendedSlot.toString(),
                    totalAddresses: addressStrings.length,
                }
                this.log(JSON.stringify(jsonOutput, null, 2))
            } else {
                this.logSuccess(formatLutDisplay(
                    lutAddress.toString(),
                    authorityStr,
                    addressStrings,
                    lut.deactivationSlot,
                    lut.lastExtendedSlot,
                    flags.verbose
                ))
            }

        } catch (error) {
            if (!spinner.isSpinning) {
                // Error was already handled with specific message
                throw error
            }
            spinner.fail('Failed to fetch Address Lookup Table')
            if (error instanceof Error) {
                throw new Error(`LUT fetch failed: ${error.message}`)
            }
            throw new Error('An unknown error occurred while fetching the LUT')
        }
    }
}