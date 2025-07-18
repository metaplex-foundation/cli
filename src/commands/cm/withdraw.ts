import { input } from '@inquirer/prompts'
import { deleteCandyMachine, fetchCandyMachine } from '@metaplex-foundation/mpl-core-candy-machine'
import { publicKey } from '@metaplex-foundation/umi'
import { Args, Flags } from '@oclif/core'
import { TransactionCommand } from '../../TransactionCommand.js'
import { terminalColors } from '../../lib/StandardColors.js'
import { txSignatureToString } from '../../lib/util.js'
import { readCmConfig } from '../../lib/cm/cm-utils.js'

export default class CmWithdraw extends TransactionCommand<typeof CmWithdraw> {
    static override description = `Withdraw a candy machine and recover funds

    Example:
    $ mplx cm withdraw
    $ mplx cm withdraw <directory>
    `

    static override examples = [
        '$ mplx cm withdraw',
        '$ mplx cm withdraw <directory>',
    ]

    static override usage = 'cm withdraw [ARGS]'

    static override args = {
        directory: Args.string({
            description: 'The directory containing the candy machine config file',
            required: false
        })
    }

    static override flags = {
        force: Flags.boolean({
            description: 'Force the withdraw of the candy machine without additional confirmation',
            default: false
        }),
        address: Flags.string({
            description: 'The address to withdraw the candy machine to',
            required: false
        })
    }

    public async run() {
        const { args, flags } = await this.parse(CmWithdraw)
        const { umi } = this.context

        try {
            let candyMachineId: string | undefined;

            if (flags.address) {
                candyMachineId = flags.address;
            } else {
                const config = readCmConfig(args.directory);
                candyMachineId = config.candyMachineId;
            }

            if (!candyMachineId) {
                this.error('Candy machine ID not found');
                return;
            }

            const candyMachinePk = publicKey(candyMachineId);

            if (!flags.force) {
                const candyMachine = await fetchCandyMachine(umi, candyMachinePk);
                const totalItemsRemaining = Number(candyMachine.items.length) - Number(candyMachine.itemsRedeemed);

                console.log(`${terminalColors.BgRed}${terminalColors.FgWhite}You are about to withdraw a candy machine${terminalColors.FgDefault}${terminalColors.BgDefault}`);
                console.log(`${terminalColors.BgRed}${terminalColors.FgWhite}Candy machine ID: ${candyMachineId}${terminalColors.FgDefault}${terminalColors.BgDefault}`);
                console.log(`${terminalColors.BgRed}${terminalColors.FgWhite}There are still ${totalItemsRemaining} non-redeemed items remaining in the candy machine${terminalColors.FgDefault}${terminalColors.BgDefault}\n`);
                console.log(`${terminalColors.BgRed}${terminalColors.FgWhite}This will remove the candy machine and all non-redeemed items from the blockchain. This action cannot be undone${terminalColors.FgDefault}${terminalColors.BgDefault}\n`);

                await input({
                    message: `Type 'yes-withdraw' to confirm`,
                    validate: (input) => {
                        if (input === 'yes-withdraw') {
                            return true;
                        }
                        return 'Please type "yes-withdraw" to confirm';
                    }
                });
            }

            const res = await this.withdraw(candyMachinePk);
            console.log(`${terminalColors.BgGreen}${terminalColors.FgWhite}Candy machine withdrawn successfully${terminalColors.FgDefault}${terminalColors.BgDefault}`);
            console.log(`${terminalColors.BgGreen}${terminalColors.FgWhite}Candy machine ID: ${candyMachineId}${terminalColors.FgDefault}${terminalColors.BgDefault}`);
            console.log(`${terminalColors.BgGreen}${terminalColors.FgWhite}Transaction hash: ${txSignatureToString(res.signature)}${terminalColors.FgDefault}${terminalColors.BgDefault}`);
        } catch (error) {
            this.error(`Withdraw failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async withdraw(candyMachinePk: ReturnType<typeof publicKey>) {
        const { umi } = this.context;
        const res = await deleteCandyMachine(umi, {
            candyMachine: candyMachinePk,
        }).sendAndConfirm(umi);

        return res;
    }
}
