import { DefaultGuardSet } from "@metaplex-foundation/mpl-core-candy-machine"
import { publicKey, sol, some } from "@metaplex-foundation/umi"
import { CandyMachineConfig, RawGuardConfig, RawGuardGroup } from "./types.js";

// Helper function to parse individual guards
const parseGuard = (guardName: string, guardValue: any): Partial<DefaultGuardSet> => {
    const parsedGuard: Partial<DefaultGuardSet> = {}

    switch (guardName) {
        case 'addressGate': {
            const { address } = guardValue as { address: string };
            parsedGuard.addressGate = some({ address: publicKey(address) });
            break;
        }
        case 'allocation': {
            const { id, limit } = guardValue as { id: number, limit: number };
            parsedGuard.allocation = some({ id, limit });
            break;
        }
        case 'allowList': {
            const { merkleRoot } = guardValue as { merkleRoot: string };
            parsedGuard.allowList = some({ merkleRoot: new Uint8Array(Buffer.from(merkleRoot, 'hex')) });
            break;
        }
        case 'assetBurn': {
            const { requiredCollection } = guardValue as { requiredCollection: string };
            parsedGuard.assetBurn = some({ requiredCollection: publicKey(requiredCollection) });
            break;
        }
        case 'assetBurnMulti': {
            const { requiredCollection, num } = guardValue as { requiredCollection: string, num: number };
            parsedGuard.assetBurnMulti = some({
                requiredCollection: publicKey(requiredCollection),
                num
            });
            break;
        }
        case 'assetGate': {
            const { requiredCollection } = guardValue as { requiredCollection: string };
            parsedGuard.assetGate = some({ requiredCollection: publicKey(requiredCollection) });
            break;
        }
        case 'assetMintLimit': {
            const { id, limit, requiredCollection } = guardValue as { id: number, limit: number, requiredCollection: string };
            parsedGuard.assetMintLimit = some({
                id,
                limit,
                requiredCollection: publicKey(requiredCollection)
            });
            break;
        }
        case 'assetPayment': {
            const { requiredCollection, destination } = guardValue as { requiredCollection: string, destination: string };
            parsedGuard.assetPayment = some({
                requiredCollection: publicKey(requiredCollection),
                destination: publicKey(destination)
            });
            break;
        }
        case 'assetPaymentMulti': {
            const { requiredCollection, destination, num } = guardValue as { requiredCollection: string, destination: string, num: number };
            parsedGuard.assetPaymentMulti = some({
                requiredCollection: publicKey(requiredCollection),
                destination: publicKey(destination),
                num
            });
            break;
        }
        case 'botTax': {
            const { lamports, lastInstruction } = guardValue as { lamports: number, lastInstruction: boolean };
            parsedGuard.botTax = some({
                lamports: sol(lamports / 10 ** 9),
                lastInstruction
            });
            break;
        }
        case 'edition': {
            const { editionStartOffset } = guardValue as { editionStartOffset: number };
            parsedGuard.edition = some({ editionStartOffset });
            break;
        }
        case 'endDate': {
            const { date } = guardValue as { date: number };
            parsedGuard.endDate = some({ date: BigInt(date) });
            break;
        }
        case 'freezeSolPayment': {
            const { lamports, destination, period } = guardValue as { lamports: number, destination: string, period: number };
            parsedGuard.freezeSolPayment = some({
                lamports: sol(lamports / 10 ** 9),
                destination: publicKey(destination),
                period: BigInt(period)
            });
            break;
        }
        case 'freezeTokenPayment': {
            const { amount, mint, destinationAta, period } = guardValue as { amount: number, mint: string, destinationAta: string, period: number };
            parsedGuard.freezeTokenPayment = some({
                amount: BigInt(amount),
                mint: publicKey(mint),
                destinationAta: publicKey(destinationAta),
                period: BigInt(period)
            });
            break;
        }
        case 'gatekeeper': {
            const { gatekeeperNetwork, expireOnUse } = guardValue as { gatekeeperNetwork: string, expireOnUse: boolean };
            parsedGuard.gatekeeper = some({
                gatekeeperNetwork: publicKey(gatekeeperNetwork),
                expireOnUse
            });
            break;
        }
        case 'mintLimit': {
            const { id, limit } = guardValue as { id: number, limit: number };
            parsedGuard.mintLimit = some({ id, limit });
            break;
        }
        case 'nftBurn': {
            const { requiredCollection } = guardValue as { requiredCollection: string };
            parsedGuard.nftBurn = some({ requiredCollection: publicKey(requiredCollection) });
            break;
        }
        case 'nftGate': {
            const { requiredCollection } = guardValue as { requiredCollection: string };
            parsedGuard.nftGate = some({ requiredCollection: publicKey(requiredCollection) });
            break;
        }
        case 'nftMintLimit': {
            const { id, limit, requiredCollection } = guardValue as { id: number, limit: number, requiredCollection: string };
            parsedGuard.nftMintLimit = some({
                id,
                limit,
                requiredCollection: publicKey(requiredCollection)
            });
            break;
        }
        case 'nftPayment': {
            const { requiredCollection, destination } = guardValue as { requiredCollection: string, destination: string };
            parsedGuard.nftPayment = some({
                requiredCollection: publicKey(requiredCollection),
                destination: publicKey(destination)
            });
            break;
        }
        case 'programGate': {
            const { additional } = guardValue as { additional: string[] };
            parsedGuard.programGate = some({
                additional: additional.map(pub => publicKey(pub))
            });
            break;
        }
        case 'redeemedAmount': {
            const { maximum } = guardValue as { maximum: number };
            parsedGuard.redeemedAmount = some({ maximum: BigInt(maximum) });
            break;
        }
        case 'solFixedFee': {
            const { lamports, destination } = guardValue as { lamports: number, destination: string };
            parsedGuard.solFixedFee = some({
                lamports: sol(lamports / 10 ** 9),
                destination: publicKey(destination)
            });
            break;
        }
        case 'solPayment': {
            const { lamports, destination } = guardValue as { lamports: number, destination: string };
            parsedGuard.solPayment = some({
                lamports: sol(lamports / 10 ** 9),
                destination: publicKey(destination)
            });
            break;
        }
        case 'startDate': {
            const { date } = guardValue as { date: number };
            parsedGuard.startDate = some({ date: BigInt(date) });
            break;
        }
        case 'thirdPartySigner': {
            const { signerKey } = guardValue as { signerKey: string };
            parsedGuard.thirdPartySigner = some({ signerKey: publicKey(signerKey) });
            break;
        }
        case 'token2022Payment': {
            const { amount, mint, destinationAta } = guardValue as { amount: number, mint: string, destinationAta: string };
            parsedGuard.token2022Payment = some({
                amount: BigInt(amount),
                mint: publicKey(mint),
                destinationAta: publicKey(destinationAta)
            });
            break;
        }
        case 'tokenBurn': {
            const { mint, amount } = guardValue as { mint: string, amount: number };
            parsedGuard.tokenBurn = some({
                mint: publicKey(mint),
                amount: BigInt(amount)
            });
            break;
        }
        case 'tokenGate': {
            const { mint, amount } = guardValue as { mint: string, amount: number };
            parsedGuard.tokenGate = some({
                mint: publicKey(mint),
                amount: BigInt(amount)
            });
            break;
        }
        case 'tokenPayment': {
            const { amount, mint, destinationAta } = guardValue as { amount: number, mint: string, destinationAta: string };
            parsedGuard.tokenPayment = some({
                amount: BigInt(amount),
                mint: publicKey(mint),
                destinationAta: publicKey(destinationAta)
            });
            break;
        }
        case 'vanityMint': {
            const { regex } = guardValue as { regex: string };
            parsedGuard.vanityMint = some({ regex });
            break;
        }
    }

    return parsedGuard
}

const jsonGuardParser = (json: CandyMachineConfig) => {
    const guards = json.config.guardConfig || {}
    const parsedGuards: Partial<DefaultGuardSet> = {}

    const groups = json.config.groups || []
    const parsedGroups: Array<{ label: string, guards: Partial<DefaultGuardSet> }> = []

    // parse guards
    for (const [guardName, guardValue] of Object.entries(guards)) {
        if (guardValue) {
            const parsedGuard = parseGuard(guardName, guardValue)
            Object.assign(parsedGuards, parsedGuard)
        }
    }

    // parse groups
    for (const group of groups) {
        const groupGuards: Partial<DefaultGuardSet> = {}

        if (group.guards) {
            for (const [guardName, guardValue] of Object.entries(group.guards)) {
                if (guardValue) {
                    const parsedGuard = parseGuard(guardName, guardValue)
                    Object.assign(groupGuards, parsedGuard)
                }
            }
        }

        parsedGroups.push({
            label: group.label,
            guards: groupGuards
        })
    }

    return {
        guards: parsedGuards,
        groups: parsedGroups
    }
}

export default jsonGuardParser