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

// Helper function to validate lamports values (should be string or number representing a number)
const isValidLamports = (value: unknown): value is string | number => {
    if (typeof value === 'string') {
        const numValue = Number(value)
        return !Number.isNaN(numValue) && 
               Number.isFinite(numValue) && 
               numValue >= 0
    }
    if (typeof value === 'number') {
        return Number.isFinite(value) && value >= 0
    }
    return false
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

const validateAssetBurnMulti = (guardValue: unknown): guardValue is RawAssetBurnMulti => {
    return isValidGuardValue(guardValue) && 
           typeof guardValue.requiredCollection === 'string' && 
           guardValue.requiredCollection.length > 0 &&
           typeof guardValue.num === 'number' && 
           Number.isInteger(guardValue.num) && 
           guardValue.num > 0
}

const validateAssetGate = (guardValue: unknown): guardValue is RawAssetGate => {
    return isValidGuardValue(guardValue) && 
           typeof guardValue.requiredCollection === 'string' && 
           guardValue.requiredCollection.length > 0
}

const validateAssetMintLimit = (guardValue: unknown): guardValue is RawAssetMintLimit => {
    return isValidGuardValue(guardValue) && 
           typeof guardValue.id === 'number' && 
           typeof guardValue.limit === 'number' && 
           typeof guardValue.requiredCollection === 'string' && 
           guardValue.requiredCollection.length > 0
}

const validateAssetPayment = (guardValue: unknown): guardValue is RawAssetPayment => {
    return isValidGuardValue(guardValue) && 
           typeof guardValue.requiredCollection === 'string' && 
           guardValue.requiredCollection.length > 0 &&
           typeof guardValue.destination === 'string' && 
           guardValue.destination.length > 0
}

const validateAssetPaymentMulti = (guardValue: unknown): guardValue is RawAssetPaymentMulti => {
    return isValidGuardValue(guardValue) && 
           typeof guardValue.requiredCollection === 'string' && 
           guardValue.requiredCollection.length > 0 &&
           typeof guardValue.destination === 'string' && 
           guardValue.destination.length > 0 &&
           typeof guardValue.num === 'number' && 
           Number.isInteger(guardValue.num) && 
           guardValue.num > 0
}

const validateEdition = (guardValue: unknown): guardValue is RawEdition => {
    return isValidGuardValue(guardValue) && 
           typeof guardValue.editionStartOffset === 'number' && 
           Number.isInteger(guardValue.editionStartOffset) && 
           guardValue.editionStartOffset >= 0
}

const validateEndDate = (guardValue: unknown): guardValue is RawEndDate => {
    return isValidGuardValue(guardValue) && 
           typeof guardValue.date === 'number' && 
           Number.isInteger(guardValue.date) && 
           guardValue.date > 0
}

const validateFreezeTokenPayment = (guardValue: unknown): guardValue is RawFreezeTokenPayment => {
    return isValidGuardValue(guardValue) && 
           typeof guardValue.amount === 'number' && 
           guardValue.amount > 0 &&
           typeof guardValue.mint === 'string' && 
           guardValue.mint.length > 0 &&
           typeof guardValue.destinationAta === 'string' && 
           guardValue.destinationAta.length > 0 &&
           typeof guardValue.period === 'number' && 
           Number.isInteger(guardValue.period) && 
           guardValue.period > 0
}

const validateGatekeeper = (guardValue: unknown): guardValue is RawGatekeeper => {
    return isValidGuardValue(guardValue) && 
           typeof guardValue.gatekeeperNetwork === 'string' && 
           guardValue.gatekeeperNetwork.length > 0 &&
           typeof guardValue.expireOnUse === 'boolean'
}

const validateMintLimit = (guardValue: unknown): guardValue is RawMintLimit => {
    return isValidGuardValue(guardValue) && 
           typeof guardValue.id === 'number' && 
           typeof guardValue.limit === 'number' && 
           Number.isInteger(guardValue.limit) && 
           guardValue.limit > 0
}

const validateNftBurn = (guardValue: unknown): guardValue is RawNftBurn => {
    return isValidGuardValue(guardValue) && 
           typeof guardValue.requiredCollection === 'string' && 
           guardValue.requiredCollection.length > 0
}

const validateNftGate = (guardValue: unknown): guardValue is RawNftGate => {
    return isValidGuardValue(guardValue) && 
           typeof guardValue.requiredCollection === 'string' && 
           guardValue.requiredCollection.length > 0
}

const validateNftMintLimit = (guardValue: unknown): guardValue is RawNftMintLimit => {
    return isValidGuardValue(guardValue) && 
           typeof guardValue.id === 'number' && 
           typeof guardValue.limit === 'number' && 
           Number.isInteger(guardValue.limit) && 
           guardValue.limit > 0 &&
           typeof guardValue.requiredCollection === 'string' && 
           guardValue.requiredCollection.length > 0
}

const validateNftPayment = (guardValue: unknown): guardValue is RawNftPayment => {
    return isValidGuardValue(guardValue) && 
           typeof guardValue.requiredCollection === 'string' && 
           guardValue.requiredCollection.length > 0 &&
           typeof guardValue.destination === 'string' && 
           guardValue.destination.length > 0
}

const validateProgramGate = (guardValue: unknown): guardValue is RawProgramGate => {
    return isValidGuardValue(guardValue) && 
           Array.isArray(guardValue.additional) &&
           guardValue.additional.every((item: unknown) => typeof item === 'string' && item.length > 0)
}

const validateRedeemedAmount = (guardValue: unknown): guardValue is RawRedeemedAmount => {
    return isValidGuardValue(guardValue) && 
           typeof guardValue.maximum === 'number' && 
           Number.isInteger(guardValue.maximum) && 
           guardValue.maximum > 0
}

const validateStartDate = (guardValue: unknown): guardValue is RawStartDate => {
    return isValidGuardValue(guardValue) && 
           typeof guardValue.date === 'number' && 
           Number.isInteger(guardValue.date) && 
           guardValue.date > 0
}

const validateThirdPartySigner = (guardValue: unknown): guardValue is RawThirdPartySigner => {
    return isValidGuardValue(guardValue) && 
           typeof guardValue.signerKey === 'string' && 
           guardValue.signerKey.length > 0
}

const validateToken2022Payment = (guardValue: unknown): guardValue is RawToken2022Payment => {
    return isValidGuardValue(guardValue) && 
           typeof guardValue.amount === 'number' && 
           guardValue.amount > 0 &&
           typeof guardValue.mint === 'string' && 
           guardValue.mint.length > 0 &&
           typeof guardValue.destinationAta === 'string' && 
           guardValue.destinationAta.length > 0
}

const validateTokenBurn = (guardValue: unknown): guardValue is RawTokenBurn => {
    return isValidGuardValue(guardValue) && 
           typeof guardValue.mint === 'string' && 
           guardValue.mint.length > 0 &&
           typeof guardValue.amount === 'number' && 
           guardValue.amount > 0
}

const validateTokenGate = (guardValue: unknown): guardValue is RawTokenGate => {
    return isValidGuardValue(guardValue) && 
           typeof guardValue.mint === 'string' && 
           guardValue.mint.length > 0 &&
           typeof guardValue.amount === 'number' && 
           guardValue.amount > 0
}

const validateTokenPayment = (guardValue: unknown): guardValue is RawTokenPayment => {
    return isValidGuardValue(guardValue) && 
           typeof guardValue.amount === 'number' && 
           guardValue.amount > 0 &&
           typeof guardValue.mint === 'string' && 
           guardValue.mint.length > 0 &&
           typeof guardValue.destinationAta === 'string' && 
           guardValue.destinationAta.length > 0
}

const validateVanityMint = (guardValue: unknown): guardValue is RawVanityMint => {
    return isValidGuardValue(guardValue) && 
           typeof guardValue.regex === 'string' && 
           guardValue.regex.length > 0
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
            if (!validateAssetBurnMulti(guardValue)) {
                throw new Error('assetBurnMulti guard requires valid requiredCollection (string) and num (positive integer) fields')
            }
            parsedGuard.assetBurnMulti = some({
                requiredCollection: publicKey(guardValue.requiredCollection),
                num: guardValue.num
            });
            break;
        }
        case 'assetGate': {
            if (!validateAssetGate(guardValue)) {
                throw new Error('assetGate guard requires a valid requiredCollection field (string)')
            }
            parsedGuard.assetGate = some({ requiredCollection: publicKey(guardValue.requiredCollection) });
            break;
        }
        case 'assetMintLimit': {
            if (!validateAssetMintLimit(guardValue)) {
                throw new Error('assetMintLimit guard requires valid id (number), limit (number), and requiredCollection (string) fields')
            }
            parsedGuard.assetMintLimit = some({
                id: guardValue.id,
                limit: guardValue.limit,
                requiredCollection: publicKey(guardValue.requiredCollection)
            });
            break;
        }
        case 'assetPayment': {
            if (!validateAssetPayment(guardValue)) {
                throw new Error('assetPayment guard requires valid requiredCollection (string) and destination (string) fields')
            }
            parsedGuard.assetPayment = some({
                requiredCollection: publicKey(guardValue.requiredCollection),
                destination: publicKey(guardValue.destination)
            });
            break;
        }
        case 'assetPaymentMulti': {
            if (!validateAssetPaymentMulti(guardValue)) {
                throw new Error('assetPaymentMulti guard requires valid requiredCollection (string), destination (string), and num (positive integer) fields')
            }
            parsedGuard.assetPaymentMulti = some({
                requiredCollection: publicKey(guardValue.requiredCollection),
                destination: publicKey(guardValue.destination),
                num: guardValue.num
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
            if (!validateEdition(guardValue)) {
                throw new Error('edition guard requires a valid editionStartOffset field (non-negative integer)')
            }
            parsedGuard.edition = some({ editionStartOffset: guardValue.editionStartOffset });
            break;
        }
        case 'endDate': {
            if (!validateEndDate(guardValue)) {
                throw new Error('endDate guard requires a valid date field (positive integer)')
            }
            parsedGuard.endDate = some({ date: BigInt(guardValue.date) });
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
            if (!validateFreezeTokenPayment(guardValue)) {
                throw new Error('freezeTokenPayment guard requires valid amount (positive number), mint (string), destinationAta (string), and period (positive integer) fields')
            }
            parsedGuard.freezeTokenPayment = some({
                amount: BigInt(guardValue.amount),
                mint: publicKey(guardValue.mint),
                destinationAta: publicKey(guardValue.destinationAta),
                period: BigInt(guardValue.period)
            });
            break;
        }
        case 'gatekeeper': {
            if (!validateGatekeeper(guardValue)) {
                throw new Error('gatekeeper guard requires valid gatekeeperNetwork (string) and expireOnUse (boolean) fields')
            }
            parsedGuard.gatekeeper = some({
                gatekeeperNetwork: publicKey(guardValue.gatekeeperNetwork),
                expireOnUse: guardValue.expireOnUse
            });
            break;
        }
        case 'mintLimit': {
            if (!validateMintLimit(guardValue)) {
                throw new Error('mintLimit guard requires valid id (number) and limit (positive integer) fields')
            }
            parsedGuard.mintLimit = some({ id: guardValue.id, limit: guardValue.limit });
            break;
        }
        case 'nftBurn': {
            if (!validateNftBurn(guardValue)) {
                throw new Error('nftBurn guard requires a valid requiredCollection field (string)')
            }
            parsedGuard.nftBurn = some({ requiredCollection: publicKey(guardValue.requiredCollection) });
            break;
        }
        case 'nftGate': {
            if (!validateNftGate(guardValue)) {
                throw new Error('nftGate guard requires a valid requiredCollection field (string)')
            }
            parsedGuard.nftGate = some({ requiredCollection: publicKey(guardValue.requiredCollection) });
            break;
        }
        case 'nftMintLimit': {
            if (!validateNftMintLimit(guardValue)) {
                throw new Error('nftMintLimit guard requires valid id (number), limit (positive integer), and requiredCollection (string) fields')
            }
            parsedGuard.nftMintLimit = some({
                id: guardValue.id,
                limit: guardValue.limit,
                requiredCollection: publicKey(guardValue.requiredCollection)
            });
            break;
        }
        case 'nftPayment': {
            if (!validateNftPayment(guardValue)) {
                throw new Error('nftPayment guard requires valid requiredCollection (string) and destination (string) fields')
            }
            parsedGuard.nftPayment = some({
                requiredCollection: publicKey(guardValue.requiredCollection),
                destination: publicKey(guardValue.destination)
            });
            break;
        }
        case 'programGate': {
            if (!validateProgramGate(guardValue)) {
                throw new Error('programGate guard requires a valid additional field (array of strings)')
            }
            parsedGuard.programGate = some({
                additional: guardValue.additional.map(pub => publicKey(pub))
            });
            break;
        }
        case 'redeemedAmount': {
            if (!validateRedeemedAmount(guardValue)) {
                throw new Error('redeemedAmount guard requires a valid maximum field (positive integer)')
            }
            parsedGuard.redeemedAmount = some({ maximum: BigInt(guardValue.maximum) });
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
            if (!validateStartDate(guardValue)) {
                throw new Error('startDate guard requires a valid date field (positive integer)')
            }
            parsedGuard.startDate = some({ date: BigInt(guardValue.date) });
            break;
        }
        case 'thirdPartySigner': {
            if (!validateThirdPartySigner(guardValue)) {
                throw new Error('thirdPartySigner guard requires a valid signerKey field (string)')
            }
            parsedGuard.thirdPartySigner = some({ signerKey: publicKey(guardValue.signerKey) });
            break;
        }
        case 'token2022Payment': {
            if (!validateToken2022Payment(guardValue)) {
                throw new Error('token2022Payment guard requires valid amount (positive number), mint (string), and destinationAta (string) fields')
            }
            parsedGuard.token2022Payment = some({
                amount: BigInt(guardValue.amount),
                mint: publicKey(guardValue.mint),
                destinationAta: publicKey(guardValue.destinationAta)
            });
            break;
        }
        case 'tokenBurn': {
            if (!validateTokenBurn(guardValue)) {
                throw new Error('tokenBurn guard requires valid mint (string) and amount (positive number) fields')
            }
            parsedGuard.tokenBurn = some({
                mint: publicKey(guardValue.mint),
                amount: BigInt(guardValue.amount)
            });
            break;
        }
        case 'tokenGate': {
            if (!validateTokenGate(guardValue)) {
                throw new Error('tokenGate guard requires valid mint (string) and amount (positive number) fields')
            }
            parsedGuard.tokenGate = some({
                mint: publicKey(guardValue.mint),
                amount: BigInt(guardValue.amount)
            });
            break;
        }
        case 'tokenPayment': {
            if (!validateTokenPayment(guardValue)) {
                throw new Error('tokenPayment guard requires valid amount (positive number), mint (string), and destinationAta (string) fields')
            }
            parsedGuard.tokenPayment = some({
                amount: BigInt(guardValue.amount),
                mint: publicKey(guardValue.mint),
                destinationAta: publicKey(guardValue.destinationAta)
            });
            break;
        }
        case 'vanityMint': {
            if (!validateVanityMint(guardValue)) {
                throw new Error('vanityMint guard requires a valid regex field (string)')
            }
            parsedGuard.vanityMint = some({ regex: guardValue.regex });
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