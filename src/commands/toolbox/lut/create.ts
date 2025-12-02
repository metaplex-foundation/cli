import { 
  createEmptyLut,
  extendLut,
  findAddressLookupTablePda
} from '@metaplex-foundation/mpl-toolbox'
import { publicKey, TransactionBuilder } from '@metaplex-foundation/umi'
import { Args, Flags } from '@oclif/core'
import ora from 'ora'

import { TransactionCommand } from '../../../TransactionCommand.js'
import umiSendAndConfirmTransaction from '../../../lib/umi/sendAndConfirm.js'
import { txSignatureToString } from '../../../lib/util.js'

const SUCCESS_MESSAGE = (lutAddress: string, signature: string) => `--------------------------------
Address Lookup Table Created
LUT Address: ${lutAddress}
Signature: ${signature}
--------------------------------`

export default class ToolboxLutCreate extends TransactionCommand<typeof ToolboxLutCreate> {
    static override description = 'Create a new Address Lookup Table (LUT) with optional initial addresses'

    static override args = {
        addresses: Args.string({ 
            description: 'Comma-separated list of public keys to include in the LUT', 
            required: false 
        }),
    }

    static override flags = {
        ...TransactionCommand.flags,
        recentSlot: Flags.integer({
            description: 'Recent slot to use for LUT creation (defaults to latest)',
            required: false,
        }),
        authority: Flags.string({
            description: 'Authority public key for the LUT (defaults to current identity)',
            required: false,
        }),
    }

    static override examples = [
        '<%= config.bin %> <%= command.id %>',
        '<%= config.bin %> <%= command.id %> "11111111111111111111111111111111,TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"',
        '<%= config.bin %> <%= command.id %> "11111111111111111111111111111111" --authority <pubkey>',
    ]

    static override usage = 'toolbox lut create [ADDRESSES]'

    private parseAddresses(addressesString?: string): string[] {
        if (!addressesString) return []
        
        return addressesString
            .split(',')
            .map(addr => addr.trim())
            .filter(addr => addr.length > 0)
    }

    private validateAddresses(addresses: string[]): void {
        for (const address of addresses) {
            try {
                publicKey(address)
            } catch {
                throw new Error(`Invalid public key: ${address}`)
            }
        }
    }

    public async run() {
        const { args, flags } = await this.parse(ToolboxLutCreate)
        const { umi } = this.context

        const addresses = this.parseAddresses(args.addresses)
        this.validateAddresses(addresses)

        const spinner = ora('Creating Address Lookup Table...').start()

        try {
            // Get recent slot if not provided
            let recentSlot = flags.recentSlot
            if (!recentSlot) {
                const slot = await umi.rpc.getSlot()
                recentSlot = Number(slot)
            }

            // Use the authority for the LUT
            const authority = flags.authority ? publicKey(flags.authority) : umi.identity.publicKey

            // Find the LUT PDA
            const lutPda = findAddressLookupTablePda(umi, {
                authority,
                recentSlot,
            })

            // Build transaction
            let tx: TransactionBuilder = createEmptyLut(umi, {
                address: lutPda,
                recentSlot,
            })

            // If addresses provided, extend the LUT in the same transaction
            if (addresses.length > 0) {
                const addressPublicKeys = addresses.map(addr => publicKey(addr))
                tx = tx.add(extendLut(umi, {
                    address: lutPda[0],
                    addresses: addressPublicKeys,
                }))
            }

            // Send and confirm transaction
            spinner.text = 'Sending transaction...'
            const result = await umiSendAndConfirmTransaction(
                umi,
                tx,
                { commitment: 'finalized' }
            )

            spinner.succeed('Address Lookup Table created successfully!')
            
            this.logSuccess(SUCCESS_MESSAGE(
                lutPda[0].toString(),
                txSignatureToString(result.transaction.signature as Uint8Array)
            ))

            // If addresses were added, show them
            if (addresses.length > 0) {
                this.log('\nInitial addresses added to LUT:')
                addresses.forEach((addr, index) => {
                    this.log(`  ${index + 1}. ${addr}`)
                })
            }

        } catch (error) {
            spinner.fail('Failed to create Address Lookup Table')
            if (error instanceof Error) {
                throw new Error(`LUT creation failed: ${error.message}`)
            }
            throw new Error('An unknown error occurred while creating the LUT')
        }
    }
}