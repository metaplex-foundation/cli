import { 
  deactivateLut,
  safeFetchAddressLookupTable
} from '@metaplex-foundation/mpl-toolbox'
import { isPublicKey, isSome, publicKey } from '@metaplex-foundation/umi'
import { Args, Flags } from '@oclif/core'
import ora from 'ora'

import { TransactionCommand } from '../../../TransactionCommand.js'
import umiSendAndConfirmTransaction from '../../../lib/umi/sendAndConfirm.js'
import { txSignatureToString } from '../../../lib/util.js'

const SUCCESS_MESSAGE = (lutAddress: string, signature: string) => `--------------------------------
Address Lookup Table Deactivated
LUT Address: ${lutAddress}
Signature: ${signature}
--------------------------------`

export default class ToolboxLutDeactivate extends TransactionCommand<typeof ToolboxLutDeactivate> {
    static override description = 'Deactivate an Address Lookup Table (LUT). This prevents adding new addresses and is required before closing.'

    static override args = {
        address: Args.string({ 
            description: 'The address of the LUT to deactivate', 
            required: true 
        }),
    }

    static override flags = {
        ...TransactionCommand.flags,
        authority: Flags.string({
            description: 'Authority public key (defaults to current identity)',
            required: false,
        }),
    }

    static override examples = [
        '<%= config.bin %> <%= command.id %> <lutAddress>',
        '<%= config.bin %> <%= command.id %> <lutAddress> --authority <pubkey>',
    ]

    static override usage = 'toolbox lut deactivate <ADDRESS>'

    private validateAddress(address: string): void {
        if (!isPublicKey(address)) {
            throw new Error(`Invalid LUT address: ${address}`)
        }
    }

    public async run() {
        const { args, flags } = await this.parse(ToolboxLutDeactivate)
        const { umi } = this.context

        // Validate inputs
        this.validateAddress(args.address)
        const lutAddress = publicKey(args.address)

        // Fetch LUT to check its status
        const spinner = ora('Fetching Address Lookup Table...').start()
        
        try {
            const lut = await safeFetchAddressLookupTable(umi, lutAddress)
            
            if (!lut) {
                spinner.fail('Address Lookup Table not found')
                throw new Error(`No Address Lookup Table found at address: ${args.address}`)
            }

            // Check authority
            if (isSome(lut.authority)) {
                const lutAuthority = lut.authority.value.toString()
                const expectedAuthority = flags.authority ? 
                    publicKey(flags.authority).toString() : 
                    umi.identity.publicKey.toString()
                
                if (lutAuthority !== expectedAuthority) {
                    spinner.fail('Authority mismatch')
                    throw new Error(`You are not the authority of this LUT. Authority: ${lutAuthority}`)
                }
            } else {
                spinner.fail('LUT has no authority')
                throw new Error('This LUT has no authority and cannot be modified')
            }

            // Check if already deactivated
            if (lut.deactivationSlot > 0n) {
                spinner.fail('LUT already deactivated')
                throw new Error(`LUT is already deactivated at slot ${lut.deactivationSlot}`)
            }

            spinner.succeed('Address Lookup Table fetched')

            // Show warning
            this.log(`\nDEACTIVATING Address Lookup Table at ${args.address}`)
            this.log('This will prevent new addresses from being added.')
            this.log('You can close it after 512 slots (~5 minutes on mainnet).\n')

            // Build and send deactivate transaction
            const deactivateSpinner = ora('Deactivating Address Lookup Table...').start()
            
            const tx = deactivateLut(umi, {
                address: lutAddress,
                authority: flags.authority ? umi.identity : undefined,
            })

            const result = await umiSendAndConfirmTransaction(
                umi,
                tx,
                { commitment: 'finalized' }
            )

            deactivateSpinner.succeed('Address Lookup Table deactivated successfully!')
            
            this.logSuccess(SUCCESS_MESSAGE(
                lutAddress.toString(),
                txSignatureToString(result.transaction.signature as Uint8Array)
            ))

            this.log('\nNote: You can close this LUT after approximately 512 slots (~5 minutes on mainnet)')
            this.log('Use: toolbox lut close <address>')

        } catch (error) {
            if (!spinner.isSpinning) {
                throw error
            }
            spinner.fail('Operation failed')
            if (error instanceof Error) {
                throw new Error(`LUT deactivation failed: ${error.message}`)
            }
            throw new Error('An unknown error occurred')
        }
    }
}