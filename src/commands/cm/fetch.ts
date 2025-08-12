import { fetchCandyGuard, fetchCandyMachine, findCandyGuardPda } from '@metaplex-foundation/mpl-core-candy-machine'
import { publicKey } from '@metaplex-foundation/umi'
import { Args, Flags } from '@oclif/core'
import fs from 'node:fs'
import path from 'node:path'
import { jsonStringify } from '../../lib/util.js'
import { TransactionCommand } from '../../TransactionCommand.js'
import { readCmConfig } from '../../lib/cm/cm-utils.js'

export default class CmFetch extends TransactionCommand<typeof CmFetch> {
    static override description = `Fetch candy machine and guard data from the blockchain`

    static override examples = [
        '$ mplx cm fetch',
        '$ mplx cm fetch <address>',
    ]

    static override usage = 'cm fetch [FLAGS] [ARGS]'

    static override args = {
        address: Args.string({
            description: 'The address of the candy machine to fetch',
            required: false
        }),
    }

    static override flags = {
        items: Flags.boolean({
            description: 'Fetch candy machine with items',
            required: false
        }),
    }

    public async run() {
        const { args, flags } = await this.parse(CmFetch)
        const { umi } = this.context

        try {
            let address = args.address;

            if (!address) {
                const config = readCmConfig();
                address = config.candyMachineId;
            }

            if (!address) {
                this.error('No address provided and no config file found with candy machine address');
            }

            const { items, ...candyMachine } = await fetchCandyMachine(umi, publicKey(address));
            const candyGuardPda = findCandyGuardPda(umi, { base: candyMachine.publicKey });
            const candyGuard = await fetchCandyGuard(umi, candyGuardPda);

            this.log(jsonStringify(candyMachine, 2));
            this.log(jsonStringify(candyGuard, 2));

            if (flags.items) {
                this.log(jsonStringify(items, 2));
            }
        } catch (error) {
            this.error(`Fetch failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
