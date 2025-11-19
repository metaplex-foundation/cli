import { CandyGuard, fetchCandyGuard, fetchCandyMachine } from '@metaplex-foundation/mpl-core-candy-machine'
import { publicKey } from '@metaplex-foundation/umi'
import { Args, Flags } from '@oclif/core'
import { readCmConfig } from '../../lib/cm/cm-utils.js'
import { jsonStringify } from '../../lib/util.js'
import { TransactionCommand } from '../../TransactionCommand.js'

export default class CmFetch extends TransactionCommand<typeof CmFetch> {
    static override description = `Fetch candy machine and guard data from the blockchain`

    static override examples = [
        '$ mplx cm fetch',
        '$ mplx cm fetch <address>',
        '$ mplx cm fetch --items',
        '$ mplx cm fetch <address> --items',
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


            let candyGuard: CandyGuard | undefined = undefined;
            let authorityOnlyMinting: boolean = false;

            const { items, ...candyMachine } = await fetchCandyMachine(umi, publicKey(address));
            const mintAuthority = candyMachine.mintAuthority;
            if (mintAuthority === candyMachine.authority) {
                authorityOnlyMinting = true;
            } else {
                this.log(`Checking if mint authority is a Candy Guard...`);
                candyGuard = await fetchCandyGuard(umi, candyMachine.mintAuthority)
                    .then(guard => guard)
                    .catch(error => {
                        this.log(`Failed to fetch candy guard: ${error instanceof Error ? error.message : String(error)}`);
                        this.log(`The mint authority address ${candyMachine.mintAuthority} doesn't appear to be a valid candy guard, may be a custom program`);
                        return undefined;
                    });
            }

            this.log(jsonStringify(candyMachine, 2));
            if (candyGuard) {
                this.log(jsonStringify(candyGuard, 2));
            } else if (authorityOnlyMinting) {
                this.log(`No candy guard - using authority-only minting`);
            } else {
                this.log(`No candy guard found - mint authority may be a custom program`);
            }

            if (flags.items) {
                this.log(jsonStringify(items, 2));
            }
        } catch (error) {
            this.error(`Fetch failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
