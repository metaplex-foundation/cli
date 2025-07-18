import { DefaultGuardSet } from "@metaplex-foundation/mpl-core-candy-machine"
import { publicKey, sol, some } from "@metaplex-foundation/umi"
import { 
    CandyMachineConfig, 
    RawGuardConfig, 
    RawGuardGroup,
    RawAddressGate,
    RawAllocation,
    RawAllowList,
    RawAssetBurn,
    RawAssetBurnMulti,
    RawAssetGate,
    RawAssetMintLimit,
    RawAssetPayment,
    RawAssetPaymentMulti,
    RawBotTax,
    RawEdition,
    RawEndDate,
    RawFreezeSolPayment,
    RawFreezeTokenPayment,
    RawGatekeeper,
    RawMintLimit,
    RawNftBurn,
    RawNftGate,
    RawNftMintLimit,
    RawNftPayment,
    RawProgramGate,
    RawRedeemedAmount,
    RawSolFixedFee,
    RawSolPayment,
    RawStartDate,
    RawThirdPartySigner,
    RawToken2022Payment,
    RawTokenBurn,
    RawTokenGate,
    RawTokenPayment,
    RawVanityMint
} from "./types.js";

// Type guard functions to validate guardValue structure
const isValidGuardValue = (guardValue: unknown): guardValue is Record<string, unknown> => {
    return guardValue !== null && typeof guardValue === 'object' && !Array.isArray(guardValue)
}

// Helper function to validate hex strings
const isValidHexString = (value: string): boolean => {
    // Check if string has even length (required for hex)
    if (value.length % 2 !== 0) return false
    // Check if string contains only valid hex characters (0-9, a-f, A-F)
    return /^[0-9a-fA-F]+$/.test(value)
}

// Helper function to validate lamports values (should be string representing a number)
const isValidLamports = (value: unknown): value is string => {
    if (typeof value !== 'string') return false
    const numValue = Number(value)
    return !Number.isNaN(numValue) && 
           Number.isFinite(numValue) && 
           numValue >= 0
}

const validateAddressGate = (guardValue: unknown): guardValue is RawAddressGate => {
    return isValidGuardValue(guardValue) && 
           typeof guardValue.address === 'string' && 
           guardValue.address.length > 0
}

const validateAllocation = (guardValue: unknown): guardValue is RawAllocation => {
    return isValidGuardValue(guardValue) && 
           typeof guardValue.id === 'number' && 
           typeof guardValue.limit === 'number'
}

const validateAllowList = (guardValue: unknown): guardValue is RawAllowList => {
    return isValidGuardValue(guardValue) && 
           typeof guardValue.merkleRoot === 'string' && 
           guardValue.merkleRoot.length > 0 &&
           isValidHexString(guardValue.merkleRoot)
}

const validateAssetBurn = (guardValue: unknown): guardValue is RawAssetBurn => {
    return isValidGuardValue(guardValue) && 
           typeof guardValue.requiredCollection === 'string' && 
           guardValue.requiredCollection.length > 0
}

const validateBotTax = (guardValue: unknown): guardValue is RawBotTax => {
    return isValidGuardValue(guardValue) && 
           isValidLamports(guardValue.lamports) && 
           typeof guardValue.lastInstruction === 'boolean'
}

const validateFreezeSolPayment = (guardValue: unknown): guardValue is RawFreezeSolPayment => {
    return isValidGuardValue(guardValue) && 
           isValidLamports(guardValue.lamports) && 
           typeof guardValue.destination === 'string' && 
           guardValue.destination.length > 0 &&
           typeof guardValue.period === 'number' && 
           Number.isFinite(guardValue.period) && 
           guardValue.period >= 0
}

const validateSolFixedFee = (guardValue: unknown): guardValue is RawSolFixedFee => {
    return isValidGuardValue(guardValue) && 
           isValidLamports(guardValue.lamports) && 
           typeof guardValue.destination === 'string' && 
           guardValue.destination.length > 0
}

const validateSolPayment = (guardValue: unknown): guardValue is RawSolPayment => {
    return isValidGuardValue(guardValue) && 
           isValidLamports(guardValue.lamports) && 
           typeof guardValue.destination === 'string' && 
           guardValue.destination.length > 0
}

// Helper function to parse individual guards
const parseGuard = (guardName: string, guardValue: unknown): Partial<DefaultGuardSet> => {
    const parsedGuard: Partial<DefaultGuardSet> = {}

    switch (guardName) {
        case 'addressGate': {
            if (!validateAddressGate(guardValue)) {
                throw new Error('addressGate guard requires a valid address field (string)')
            }
            parsedGuard.addressGate = some({ address: publicKey(guardValue.address) });
            break;
        }
        case 'allocation': {
            if (!validateAllocation(guardValue)) {
                throw new Error('allocation guard requires valid id and limit fields (numbers)')
            }
            parsedGuard.allocation = some({ id: guardValue.id, limit: guardValue.limit });
            break;
        }
        case 'allowList': {
            if (!validateAllowList(guardValue)) {
                throw new Error('allowList guard requires a valid merkleRoot field (valid hex string)')
            }
            try {
                parsedGuard.allowList = some({ merkleRoot: new Uint8Array(Buffer.from(guardValue.merkleRoot, 'hex')) });
            } catch (error) {
                throw new Error(`allowList guard merkleRoot contains invalid hex data: ${error instanceof Error ? error.message : 'Unknown error'}`)
            }
            break;
        }
        case 'assetBurn': {
            if (!validateAssetBurn(guardValue)) {
                throw new Error('assetBurn guard requires a valid requiredCollection field (string)')
            }
            parsedGuard.assetBurn = some({ requiredCollection: publicKey(guardValue.requiredCollection) });
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
            if (!validateBotTax(guardValue)) {
                throw new Error('botTax guard requires valid lamports (numeric string >= 0) and lastInstruction (boolean) fields')
            }
            const validatedGuard = guardValue as RawBotTax;
            parsedGuard.botTax = some({
                lamports: sol(Number(validatedGuard.lamports) / 10 ** 9),
                lastInstruction: validatedGuard.lastInstruction
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
            if (!validateFreezeSolPayment(guardValue)) {
                throw new Error('freezeSolPayment guard requires valid lamports (numeric string >= 0), destination (string), and period (finite number >= 0) fields')
            }
            const validatedGuard = guardValue as RawFreezeSolPayment;
            parsedGuard.freezeSolPayment = some({
                lamports: sol(Number(validatedGuard.lamports) / 10 ** 9),
                destination: publicKey(validatedGuard.destination),
                period: BigInt(validatedGuard.period)
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
            if (!validateSolFixedFee(guardValue)) {
                throw new Error('solFixedFee guard requires valid lamports (numeric string >= 0) and destination (string) fields')
            }
            const validatedGuard = guardValue as RawSolFixedFee;
            parsedGuard.solFixedFee = some({
                lamports: sol(Number(validatedGuard.lamports) / 10 ** 9),
                destination: publicKey(validatedGuard.destination)
            });
            break;
        }
        case 'solPayment': {
            if (!validateSolPayment(guardValue)) {
                throw new Error('solPayment guard requires valid lamports (numeric string >= 0) and destination (string) fields')
            }
            const validatedGuard = guardValue as RawSolPayment;
            parsedGuard.solPayment = some({
                lamports: sol(Number(validatedGuard.lamports) / 10 ** 9),
                destination: publicKey(validatedGuard.destination)
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
    try {
        const guards = json.config.guardConfig || {}
        const parsedGuards: Partial<DefaultGuardSet> = {}

        const groups = json.config.groups || []
        const parsedGroups: Array<{ label: string, guards: Partial<DefaultGuardSet> }> = []

        // parse guards
        for (const [guardName, guardValue] of Object.entries(guards)) {
            if (guardValue) {
                try {
                    const parsedGuard = parseGuard(guardName, guardValue)
                    Object.assign(parsedGuards, parsedGuard)
                } catch (error) {
                    console.error(`Error parsing guard '${guardName}':`, error)
                    throw new Error(`Failed to parse guard '${guardName}': ${error instanceof Error ? error.message : 'Unknown error'}`)
                }
            }
        }

        // parse groups
        for (const group of groups) {
            const groupGuards: Partial<DefaultGuardSet> = {}

            if (group.guards) {
                for (const [guardName, guardValue] of Object.entries(group.guards)) {
                    if (guardValue) {
                        try {
                            const parsedGuard = parseGuard(guardName, guardValue)
                            Object.assign(groupGuards, parsedGuard)
                        } catch (error) {
                            console.error(`Error parsing guard '${guardName}' in group '${group.label}':`, error)
                            throw new Error(`Failed to parse guard '${guardName}' in group '${group.label}': ${error instanceof Error ? error.message : 'Unknown error'}`)
                        }
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
    } catch (error) {
        console.error('Error in jsonGuardParser:', error)
        if (error instanceof Error && error.message.includes('Failed to parse guard')) {
            // Re-throw guard parsing errors with their specific context
            throw error
        }
        // Handle other errors (malformed JSON structure, missing properties, etc.)
        throw new Error(`Failed to parse candy machine guard configuration: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
}

export default jsonGuardParser