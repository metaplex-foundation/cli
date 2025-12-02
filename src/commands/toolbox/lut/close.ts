import { 
  closeLut,
  safeFetchAddressLookupTable
} from '@metaplex-foundation/mpl-toolbox'
import { isPublicKey, isSome, publicKey } from '@metaplex-foundation/umi'
import { Args, Flags } from '@oclif/core'
import ora from 'ora'

import { TransactionCommand } from '../../../TransactionCommand.js'
import umiSendAndConfirmTransaction from '../../../lib/umi/sendAndConfirm.js'
import { txSignatureToString } from '../../../lib/util.js'

const SUCCESS_MESSAGE = (lutAddress: string, signature: string) => `--------------------------------
Address Lookup Table Closed
LUT Address: ${lutAddress}
Signature: ${signature}
--------------------------------`

export default class ToolboxLutClose extends TransactionCommand<typeof ToolboxLutClose> {
    static override description = 'Close a deactivated Address Lookup Table (LUT) and reclaim rent. The LUT must be deactivated first using the deactivate command.'

    static override args = {
        address: Args.string({ 
            description: 'The address of the LUT to close', 
            required: true 
        }),
    }

    static override flags = {
        ...TransactionCommand.flags,
        recipient: Flags.string({
            description: 'Recipient address for reclaimed rent (defaults to current identity)',
            required: false,
        }),
        authority: Flags.string({
            description: 'Authority public key (defaults to current identity)',
            required: false,
        }),
    }

    static override examples = [
        '<%= config.bin %> <%= command.id %> <lutAddress>',
        '<%= config.bin %> <%= command.id %> <lutAddress> --recipient <address>',
        '<%= config.bin %> <%= command.id %> <lutAddress> --authority <pubkey>',
    ]

    static override usage = 'toolbox lut close <ADDRESS>'

    private validateAddress(address: string): void {
        if (!isPublicKey(address)) {
            throw new Error(`Invalid LUT address: ${address}`)
        }
    }

    private validateRecipient(recipient?: string): void {
        if (recipient && !isPublicKey(recipient)) {
            throw new Error(`Invalid recipient address: ${recipient}`)
        }
    }

    public async run() {
        const { args, flags } = await this.parse(ToolboxLutClose)
        const { umi } = this.context

        // Validate inputs
        this.validateAddress(args.address)
        this.validateRecipient(flags.recipient)

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

            // Check if deactivated
            if (lut.deactivationSlot === 0n) {
                spinner.fail('LUT not deactivated')
                throw new Error('LUT must be deactivated before it can be closed. Use: toolbox lut deactivate <address>')
            }

            // Check if enough time has passed (512 slots)
            const currentSlot = await umi.rpc.getSlot()
            const slotsSinceDeactivation = Number(currentSlot) - Number(lut.deactivationSlot)
            
            if (slotsSinceDeactivation < 512) {
                const remainingSlots = 512 - slotsSinceDeactivation
                spinner.fail('Too early to close')
                throw new Error(`LUT cannot be closed yet. Wait ${remainingSlots} more slots (~${Math.ceil(remainingSlots * 0.4 / 60)} minutes)`)
            }

            spinner.succeed('Address Lookup Table fetched and validated')

            // Show warning
            const recipientAddress = flags.recipient || umi.identity.publicKey.toString()
            this.log(`\nCLOSING Address Lookup Table at ${args.address}`)
            this.log(`Rent will be reclaimed to: ${recipientAddress}`)
            this.log('This action is IRREVERSIBLE!\n')

            // Build and send close transaction
            const closeSpinner = ora('Closing Address Lookup Table...').start()
            
            const recipient = flags.recipient ? publicKey(flags.recipient) : umi.identity.publicKey

            const tx = closeLut(umi, {
                address: lutAddress,
                authority: flags.authority ? umi.identity : undefined,
                recipient,
            })

            const result = await umiSendAndConfirmTransaction(
                umi,
                tx,
                { commitment: 'finalized' }
            )

            closeSpinner.succeed('Address Lookup Table closed successfully!')
            
            this.logSuccess(SUCCESS_MESSAGE(
                lutAddress.toString(),
                txSignatureToString(result.transaction.signature as Uint8Array)
            ))

            this.log(`\nRent reclaimed to: ${recipient.toString()}`)

        } catch (error) {
            if (!spinner.isSpinning) {
                throw error
            }
            spinner.fail('Operation failed')
            if (error instanceof Error) {
                throw new Error(`LUT close failed: ${error.message}`)
            }
            throw new Error('An unknown error occurred')
        }
    }
}