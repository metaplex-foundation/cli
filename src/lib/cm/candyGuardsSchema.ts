import { PromptItem } from "../../prompts/promptSelector.js"


export const addressGateSchema: PromptItem[] = [
    {
        name: 'address',
        prompt: 'Enter address',
        type: 'publicKey',
        required: true,
    }
]

export const allocationSchema: PromptItem[] = [
    {
        name: 'id',
        prompt: 'Enter id for the allocation. This is a unique identifier for the allocation',
        type: 'number',
        required: true,
    },
    {
        name: 'limit',
        prompt: 'Enter the number of mints that can be allocated to the wallet per. If guard is added group then this allocation is per group',
        type: 'number',
        required: true,
    }
]

export const allowListSchema: PromptItem[] = [
    {
        name: 'merkleRoot',
        prompt: 'Enter merkle root',
        type: 'string',
        required: true,
    },
]

export const botTaxSchema: PromptItem[] = [
    {
        name: 'lamports',
        prompt: 'Enter botTax amount in lamports',
        type: 'number',
        required: true,
    },
    {
        name: 'lastInstruction',
        prompt: 'Is last instruction? If true it checks minting is the last instruction in the transaction',
        type: 'boolean',
    },
]

export const endDateSchema: PromptItem[] = [
    {
        name: 'date',
        prompt: 'Enter end date for the candy machine or group',
        type: 'date',
        required: true,
    },
]

export const freezeSolPaymentSchema: PromptItem[] = [
    {
        name: 'lamports',
        prompt: 'Enter SOL amount in lamports',
        type: 'number',
        required: true,
    },
    {
        name: 'destination',
        prompt: 'Enter destination address for SOL',
        type: 'publicKey',
        required: true,
    },
    {
        name: 'period',
        prompt: 'The freeze period in seconds (maximum 30 days)',
        type: 'number',
        required: true,
    },

]

export const freezeTokenPaymentSchema: PromptItem[] = [
    {
        name: 'amount',
        prompt: 'Amount of tokens to charge for minting',
        type: 'number',
        required: true,
    },
    {
        name: 'mint',
        prompt: 'Enter mint address for the token to be used for payment',
        type: 'publicKey',
        required: true,
    },
    {
        name: 'destinationAta',
        prompt: 'Enter destination ata address for the token being used for payment',
        type: 'publicKey',
        required: true,
    },
    {
        name: 'period',
        prompt: 'The freeze period in seconds (maximum 30 days)',
        type: 'number',
        required: true,
    },
]


export const mintLimitSchema: PromptItem[] = [
    {
        name: 'id',
        prompt: 'Enter id for the mint limit. This is a unique identifier for the mint limit',
        type: 'number',
        required: true,
    },
    {
        name: 'limit',
        prompt: 'Enter limit for the mint limit. This is the maximum number of mints that can be minted by a wallet for id',
        type: 'number',
        required: true,
    },
]

export const nftBurnSchema: PromptItem[] = [
    {
        name: 'requiredCollection',
        prompt: 'Enter required collection public key',
        type: 'publicKey',
        required: true,
    },
]

export const nftGateSchema: PromptItem[] = [
    {
        name: 'requiredCollection',
        prompt: 'Enter required collection public key',
        type: 'publicKey',
        required: true,
    },
]

export const nftMintLimitSchema: PromptItem[] = [
    {
        name: 'id',
        prompt: 'Enter id',
        type: 'number',
        required: true,
    },
    {
        name: 'limit',
        prompt: 'Enter limit',
        type: 'number',
        required: true,
    },
    {
        name: 'requiredCollection',
        prompt: 'Enter required collection public key',
        type: 'publicKey',
        required: true,
    },
]

export const nftPaymentSchema: PromptItem[] = [
    {
        name: 'requiredCollection',
        prompt: 'Enter required collection public key for the nft payment',
        type: 'publicKey',
        required: true,
    },
]

export const programGateSchema: PromptItem[] = [
    {
        name: 'additional',
        prompt: 'Enter additional public keys for the program gate',
        type: 'array',
        items: 'publicKey',
        required: true,
    },
]

export const redeemedAmountSchema: PromptItem[] = [
    {
        name: 'maximum',
        prompt: 'Enter maximum number of mints to be redeemed for the entire candy machine',
        type: 'number',
        required: true,
    },
]

export const solFixedFeeSchema: PromptItem[] = [
    {
        name: 'lamports',
        prompt: 'Enter SOL amount in lamports',
        type: 'number', // custom handler
        required: true,
    },
    {
        name: 'destination',
        prompt: 'Enter SOL destination address',
        type: 'publicKey',
        required: true,
    },
]


export const solPaymentSchema: PromptItem[] = [
    {
        name: 'lamports',
        prompt: 'Enter SOL amount in lamports',
        type: 'number', // custom handler
        required: true,
    },
    {
        name: 'destination',
        prompt: 'Enter SOL destination address',
        type: 'publicKey',
        required: true,
    },
];

export const startDateSchema: PromptItem[] = [
    {
        name: 'date',
        prompt: 'Enter start date for the candy machine or group',
        type: 'date',
        required: true,
    },
]

export const thirdPartySignerSchema: PromptItem[] = [
    {
        name: 'signerKey',
        prompt: 'Enter signer public key that is required to sign the mint transaction',
        type: 'publicKey',
        required: true,
    },
]

export const tokenBurnSchema: PromptItem[] = [
    {
        name: 'mint',
        prompt: 'Enter mint address for the token to be burned',
        type: 'publicKey',
        required: true,
    },
    {
        name: 'amount',
        prompt: 'Enter amount of tokens to be burned',
        type: 'number',
        required: true,
    },
]

export const tokenGateSchema: PromptItem[] = [
    {
        name: 'mint',
        prompt: 'Enter mint address for the token to be held by the wallet',
        type: 'publicKey',
        required: true,
    },
    {
        name: 'amount',
        prompt: 'Enter amount of tokens to be held by the wallet',
        type: 'number',
        required: true,
    },
]

export const token2022PaymentSchema: PromptItem[] = [
    {
        name: 'amount',
        prompt: 'Enter amount of tokens to be paid',
        type: 'number',
        required: true,
    },
    {
        name: 'mint',
        prompt: 'Enter mint address for the token to be held by the wallet',
        type: 'publicKey',
        required: true,
    },
    {
        name: 'destinationAta',
        prompt: 'Enter destination ata address for the token being used for payment',
        type: 'publicKey',
        required: true,
    },
]

export const editionSchema: PromptItem[] = [
    {
        name: 'editionStartOffset',
        prompt: 'Enter edition start offset. This is the starting number of the editions',
        type: 'number',
        required: true,
    },
]

export const assetPaymentSchema: PromptItem[] = [
    {
        name: 'requiredCollection',
        prompt: 'Enter required collection public key for the asset payment',
        type: 'publicKey',
        required: true,
    },
    {
        name: 'destination',
        prompt: 'Enter destination address to send the asset to',
        type: 'publicKey',
        required: true,
    },
]

export const assetBurnSchema: PromptItem[] = [
    {
        name: 'requiredCollection',
        prompt: 'Enter required collection public key for the asset burn',
        type: 'publicKey',
        required: true,
    },
]

export const assetMintLimitSchema: PromptItem[] = [
    {
        name: 'id',
        prompt: 'Enter id for the asset mint limit. This is a unique identifier for the asset mint limit guard',
        type: 'number',
        required: true,
    },
    {
        name: 'limit',
        prompt: 'Enter limit for the asset mint limit. This is the maximum number of assets that can be minted by a wallet for id',
        type: 'number',
        required: true,
    },
    {
        name: 'requiredCollection',
        prompt: 'Enter required collection address for the asset mint limit',
        type: 'publicKey',
        required: true,
    },
]

export const assetBurnMultiSchema: PromptItem[] = [
    {
        name: 'requiredCollection',
        prompt: 'Enter required collection address for the asset burn multi',
        type: 'publicKey',
        required: true,
    },
    {
        name: 'num',
        prompt: 'Enter number of assets to be burned for the asset burn multi guard',
        type: 'number',
        required: true,
    },
]

export const assetPaymentMultiSchema: PromptItem[] = [
    {
        name: 'requiredCollection',
        prompt: 'Enter required collection address for the asset payment multi',
        type: 'publicKey',
        required: true,
    },
    {
        name: 'destination',
        prompt: 'Enter destination address to send the assets to',
        type: 'publicKey',
        required: true,
    },
    {
        name: 'num',
        prompt: 'Enter number of assets to be paid with for the asset payment multi guard',
        type: 'number',
        required: true,
    },
]

export const assetGateSchema: PromptItem[] = [
    {
        name: 'requiredCollection',
        prompt: 'Enter required collection address for the asset gate',
        type: 'publicKey',
        required: true,
    },
]

export const vanityMintSchema: PromptItem[] = [
    {
        name: 'regex',
        prompt: 'Enter regex to match the mint address for the vanity mint guard',
        type: 'string',
        required: true,
    },
]

export const candyGuardsSchema: { [key: string]: PromptItem[] } = {
    addressGate: addressGateSchema,
    allocation: allocationSchema,
    allowList: allowListSchema,
    botTax: botTaxSchema,
    endDate: endDateSchema,
    freezeSolPayment: freezeSolPaymentSchema,
    freezeTokenPayment: freezeTokenPaymentSchema,
    mintLimit: mintLimitSchema,
    nftBurn: nftBurnSchema,
    nftGate: nftGateSchema,
    nftMintLimit: nftMintLimitSchema,
    nftPayment: nftPaymentSchema,
    programGate: programGateSchema,
    redeemedAmount: redeemedAmountSchema,
    solFixedFee: solFixedFeeSchema,
    solPayment: solPaymentSchema,
    startDate: startDateSchema,
    thirdPartySigner: thirdPartySignerSchema,
    tokenBurn: tokenBurnSchema,
    tokenGate: tokenGateSchema,
    token2022Payment: token2022PaymentSchema,
    edition: editionSchema,
    assetPayment: assetPaymentSchema,
    assetBurn: assetBurnSchema,
    assetMintLimit: assetMintLimitSchema,
    assetBurnMulti: assetBurnMultiSchema,
    assetPaymentMulti: assetPaymentMultiSchema,
    assetGate: assetGateSchema,
    vanityMint: vanityMintSchema,
}