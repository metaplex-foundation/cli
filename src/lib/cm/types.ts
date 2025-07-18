import type { ConfigLineSettings, HiddenSettings } from "@metaplex-foundation/mpl-core-candy-machine"

// Raw guard configuration types (before parsing)
export type RawAddressGate = {
    address: string
}

export type RawAllocation = {
    id: number
    limit: number
}

export type RawAllowList = {
    merkleRoot: string
}

export type RawAssetBurn = {
    requiredCollection: string
}

export type RawAssetBurnMulti = {
    requiredCollection: string
    num: number
}

export type RawAssetGate = {
    requiredCollection: string
}

export type RawAssetMintLimit = {
    id: number
    limit: number
    requiredCollection: string
}

export type RawAssetPayment = {
    requiredCollection: string
    destination: string
}

export type RawAssetPaymentMulti = {
    requiredCollection: string
    destination: string
    num: number
}

export type RawBotTax = {
    lamports: string
    lastInstruction: boolean
}

export type RawEdition = {
    editionStartOffset: number
}

export type RawEndDate = {
    date: number
}

export type RawFreezeSolPayment = {
    lamports: string
    destination: string
    period: number
}

export type RawFreezeTokenPayment = {
    amount: string
    mint: string
    destinationAta: string
    period: number
}

export type RawGatekeeper = {
    gatekeeperNetwork: string
    expireOnUse: boolean
}

export type RawMintLimit = {
    id: number
    limit: number
}

export type RawNftBurn = {
    requiredCollection: string
}

export type RawNftGate = {
    requiredCollection: string
}

export type RawNftMintLimit = {
    id: number
    limit: number
    requiredCollection: string
}

export type RawNftPayment = {
    requiredCollection: string
    destination: string
}

export type RawProgramGate = {
    additional: string[]
}

export type RawRedeemedAmount = {
    maximum: number
}

export type RawSolFixedFee = {
    lamports: string
    destination: string
}

export type RawSolPayment = {
    lamports: string
    destination: string
}

export type RawStartDate = {
    date: number
}

export type RawThirdPartySigner = {
    signerKey: string
}

export type RawToken2022Payment = {
    amount: string
    mint: string
    destinationAta: string
}

export type RawTokenBurn = {
    mint: string
    amount: string
}

export type RawTokenGate = {
    mint: string
    amount: string
}

export type RawTokenPayment = {
    amount: string
    mint: string
    destinationAta: string
}

export type RawVanityMint = {
    regex: string
}

// Utility type to ensure object has at least one property
type NonEmptyObject<T> = {
    [K in keyof T]: T[K]
} & {
    [K in keyof T]: T[K] extends undefined ? never : T[K]
}

// Union type for all raw guards - must have at least one guard property
export type RawGuardConfig = NonEmptyObject<{
    addressGate?: RawAddressGate
    allocation?: RawAllocation
    allowList?: RawAllowList
    assetBurn?: RawAssetBurn
    assetBurnMulti?: RawAssetBurnMulti
    assetGate?: RawAssetGate
    assetMintLimit?: RawAssetMintLimit
    assetPayment?: RawAssetPayment
    assetPaymentMulti?: RawAssetPaymentMulti
    botTax?: RawBotTax
    edition?: RawEdition
    endDate?: RawEndDate
    freezeSolPayment?: RawFreezeSolPayment
    freezeTokenPayment?: RawFreezeTokenPayment
    gatekeeper?: RawGatekeeper
    mintLimit?: RawMintLimit
    nftBurn?: RawNftBurn
    nftGate?: RawNftGate
    nftMintLimit?: RawNftMintLimit
    nftPayment?: RawNftPayment
    programGate?: RawProgramGate
    redeemedAmount?: RawRedeemedAmount
    solFixedFee?: RawSolFixedFee
    solPayment?: RawSolPayment
    startDate?: RawStartDate
    thirdPartySigner?: RawThirdPartySigner
    token2022Payment?: RawToken2022Payment
    tokenBurn?: RawTokenBurn
    tokenGate?: RawTokenGate
    tokenPayment?: RawTokenPayment
    vanityMint?: RawVanityMint
}>

// Raw group configuration
export type RawGuardGroup = {
    label: string
    guards: RawGuardConfig
}

export interface CandyMachineConfig {
    name: string
    candyMachineId?: string
    readonly directory?: string
    readonly assetsDirectory?: string
    config: {
        collection: string
        itemsAvailable: number
        isMutable: boolean
        readonly isSequential: boolean
        guardConfig?: RawGuardConfig
        groups?: RawGuardGroup[]
        readonly configLineSettings?: ConfigLineSettings
        readonly hiddenSettings?: HiddenSettings
    }
}

export interface CandyMachineAssetCache {
    assetItems: Record<number, CandyMachineAssetCacheItem>
}

export interface CandyMachineAssetCacheItem {
    name: string
    image?: string
    imageUri?: string
    imageType?: string
    animation?: string
    animationUri?: string
    animationType?: string
    json?: string
    jsonUri?: string
    loaded?: boolean
    revealed?: string // address of the Core NFT Asset the item was revealed to
}