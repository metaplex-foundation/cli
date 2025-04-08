import { PublicKey } from '@solana/web3.js'
import { DefaultGuardSetMintArgs } from '@metaplex-foundation/mpl-core-candy-machine'

export type GuardPrompt = {
    type: 'number' | 'text' | 'confirm' | 'input'
    name: string
    message: string
    validate?: (input: string) => boolean | string
}

export type GuardPrompts = {
    [K in keyof DefaultGuardSetMintArgs]?: GuardPrompt[]
}

export const guardPrompts: GuardPrompts = {
    addressGate: [
        {
            type: 'text',
            name: 'address',
            message: 'Enter allowed address',
            validate: (input: string) => {
                try {
                    new PublicKey(input)
                    return true
                } catch {
                    return 'Invalid public key'
                }
            }
        }
    ],
    allocation: [
        {
            type: 'number',
            name: 'id',
            message: 'Enter ID',
            validate: (input: string) => {
                try {
                    BigInt(input)
                    return true
                } catch {
                    return 'Invalid number'
                }
            }
        },
        {
            type: 'number',
            name: 'size',
            message: 'Enter allocation size',
            validate: (input: string) => {
                try {
                    BigInt(input)
                    return true
                } catch {
                    return 'Invalid number'
                }
            }
        }
    ],
    allowList: [
        {
            type: 'text',
            name: 'merkleRoot',
            message: 'Enter merkle root (32 bytes in hex)',
            validate: (input: string) => {
                try {
                    Buffer.from(input, 'hex')
                    return true
                } catch {
                    return 'Invalid hex string'
                }
            }
        }
    ],
    assetBurn: [
        {
            type: 'text',
            name: 'requiredCollection',
            message: 'Enter required collection address',
            validate: (input: string) => {
                try {
                    new PublicKey(input)
                    return true
                } catch {
                    return 'Invalid public key'
                }
            }
        }
    ],
    assetBurnMulti: [
        {
            type: 'text',
            name: 'requiredCollections',
            message: 'Enter required collection addresses (comma-separated)',
            validate: (input: string) => {
                try {
                    input.split(',').forEach(addr => new PublicKey(addr.trim()))
                    return true
                } catch {
                    return 'Invalid public key(s)'
                }
            }
        }
    ],
    assetGate: [
        {
            type: 'text',
            name: 'requiredCollection',
            message: 'Enter required collection address',
            validate: (input: string) => {
                try {
                    new PublicKey(input)
                    return true
                } catch {
                    return 'Invalid public key'
                }
            }
        }
    ],
    assetMintLimit: [
        {
            type: 'text',
            name: 'requiredCollection',
            message: 'Enter required collection address',
            validate: (input: string) => {
                try {
                    new PublicKey(input)
                    return true
                } catch {
                    return 'Invalid public key'
                }
            }
        },
        {
            type: 'number',
            name: 'limit',
            message: 'Enter mint limit',
            validate: (input: string) => {
                try {
                    BigInt(input)
                    return true
                } catch {
                    return 'Invalid number'
                }
            }
        }
    ],
    assetPayment: [
        {
            type: 'text',
            name: 'requiredCollection',
            message: 'Enter required collection address',
            validate: (input: string) => {
                try {
                    new PublicKey(input)
                    return true
                } catch {
                    return 'Invalid public key'
                }
            }
        },
        {
            type: 'text',
            name: 'destination',
            message: 'Enter destination wallet address',
            validate: (input: string) => {
                try {
                    new PublicKey(input)
                    return true
                } catch {
                    return 'Invalid public key'
                }
            }
        }
    ],
    assetPaymentMulti: [
        {
            type: 'text',
            name: 'requiredCollections',
            message: 'Enter required collection addresses (comma-separated)',
            validate: (input: string) => {
                try {
                    input.split(',').forEach(addr => new PublicKey(addr.trim()))
                    return true
                } catch {
                    return 'Invalid public key(s)'
                }
            }
        },
        {
            type: 'text',
            name: 'destination',
            message: 'Enter destination wallet address',
            validate: (input: string) => {
                try {
                    new PublicKey(input)
                    return true
                } catch {
                    return 'Invalid public key'
                }
            }
        }
    ],
    botTax: [
        {
            type: 'number',
            name: 'lamports',
            message: 'Enter bot tax amount in lamports',
            validate: (input: string) => {
                try {
                    BigInt(input)
                    return true
                } catch {
                    return 'Invalid number'
                }
            }
        }
    ],
    endDate: [
        {
            type: 'number',
            name: 'date',
            message: 'Enter end date (Unix timestamp)',
            validate: (input: string) => {
                try {
                    BigInt(input)
                    return true
                } catch {
                    return 'Invalid timestamp'
                }
            }
        }
    ],
    freezeSolPayment: [
        {
            type: 'number',
            name: 'lamports',
            message: 'Enter amount in lamports',
            validate: (input: string) => {
                try {
                    BigInt(input)
                    return true
                } catch {
                    return 'Invalid number'
                }
            }
        },
        {
            type: 'text',
            name: 'destination',
            message: 'Enter destination wallet address',
            validate: (input: string) => {
                try {
                    new PublicKey(input)
                    return true
                } catch {
                    return 'Invalid public key'
                }
            }
        }
    ],
    freezeTokenPayment: [
        {
            type: 'text',
            name: 'mint',
            message: 'Enter token mint address',
            validate: (input: string) => {
                try {
                    new PublicKey(input)
                    return true
                } catch {
                    return 'Invalid public key'
                }
            }
        },
        {
            type: 'number',
            name: 'amount',
            message: 'Enter token amount',
            validate: (input: string) => {
                try {
                    BigInt(input)
                    return true
                } catch {
                    return 'Invalid number'
                }
            }
        },
        {
            type: 'text',
            name: 'destinationAta',
            message: 'Enter destination ATA address',
            validate: (input: string) => {
                try {
                    new PublicKey(input)
                    return true
                } catch {
                    return 'Invalid public key'
                }
            }
        }
    ],
    gatekeeper: [
        {
            type: 'text',
            name: 'gatekeeperNetwork',
            message: 'Enter gatekeeper network address',
            validate: (input: string) => {
                try {
                    new PublicKey(input)
                    return true
                } catch {
                    return 'Invalid public key'
                }
            }
        },
        {
            type: 'confirm',
            name: 'expireOnUse',
            message: 'Should the token expire after use?'
        }
    ],
    mintLimit: [
        {
            type: 'number',
            name: 'id',
            message: 'Enter ID',
            validate: (input: string) => {
                try {
                    BigInt(input)
                    return true
                } catch {
                    return 'Invalid number'
                }
            }
        },
        {
            type: 'number',
            name: 'limit',
            message: 'Enter mint limit',
            validate: (input: string) => {
                try {
                    BigInt(input)
                    return true
                } catch {
                    return 'Invalid number'
                }
            }
        }
    ],
    nftBurn: [
        {
            type: 'text',
            name: 'requiredCollection',
            message: 'Enter required collection address',
            validate: (input: string) => {
                try {
                    new PublicKey(input)
                    return true
                } catch {
                    return 'Invalid public key'
                }
            }
        }
    ],
    nftGate: [
        {
            type: 'text',
            name: 'requiredCollection',
            message: 'Enter required collection address',
            validate: (input: string) => {
                try {
                    new PublicKey(input)
                    return true
                } catch {
                    return 'Invalid public key'
                }
            }
        }
    ],
    nftPayment: [
        {
            type: 'text',
            name: 'requiredCollection',
            message: 'Enter required collection address',
            validate: (input: string) => {
                try {
                    new PublicKey(input)
                    return true
                } catch {
                    return 'Invalid public key'
                }
            }
        },
        {
            type: 'text',
            name: 'destination',
            message: 'Enter destination wallet address',
            validate: (input: string) => {
                try {
                    new PublicKey(input)
                    return true
                } catch {
                    return 'Invalid public key'
                }
            }
        }
    ],
    programGate: [
        {
            type: 'text',
            name: 'additionalPrograms',
            message: 'Enter additional program addresses (comma-separated)',
            validate: (input: string) => {
                try {
                    input.split(',').forEach(addr => new PublicKey(addr.trim()))
                    return true
                } catch {
                    return 'Invalid public key(s)'
                }
            }
        }
    ],
    redeemedAmount: [
        {
            type: 'number',
            name: 'maximum',
            message: 'Enter maximum redeemed amount',
            validate: (input: string) => {
                try {
                    BigInt(input)
                    return true
                } catch {
                    return 'Invalid number'
                }
            }
        }
    ],
    solPayment: [
        {
            type: 'number',
            name: 'lamports',
            message: 'Enter amount in lamports',
            validate: (input: string) => {
                try {
                    BigInt(input)
                    return true
                } catch {
                    return 'Invalid number'
                }
            }
        },
        {
            type: 'text',
            name: 'destination',
            message: 'Enter destination wallet address',
            validate: (input: string) => {
                try {
                    new PublicKey(input)
                    return true
                } catch {
                    return 'Invalid public key'
                }
            }
        }
    ],
    startDate: [
        {
            type: 'number',
            name: 'date',
            message: 'Enter start date (Unix timestamp)',
            validate: (input: string) => {
                try {
                    BigInt(input)
                    return true
                } catch {
                    return 'Invalid timestamp'
                }
            }
        }
    ],
    tokenBurn: [
        {
            type: 'text',
            name: 'mint',
            message: 'Enter token mint address',
            validate: (input: string) => {
                try {
                    new PublicKey(input)
                    return true
                } catch {
                    return 'Invalid public key'
                }
            }
        },
        {
            type: 'number',
            name: 'amount',
            message: 'Enter amount to burn',
            validate: (input: string) => {
                try {
                    BigInt(input)
                    return true
                } catch {
                    return 'Invalid number'
                }
            }
        }
    ],
    tokenGate: [
        {
            type: 'text',
            name: 'mint',
            message: 'Enter token mint address',
            validate: (input: string) => {
                try {
                    new PublicKey(input)
                    return true
                } catch {
                    return 'Invalid public key'
                }
            }
        },
        {
            type: 'number',
            name: 'amount',
            message: 'Enter required token amount',
            validate: (input: string) => {
                try {
                    BigInt(input)
                    return true
                } catch {
                    return 'Invalid number'
                }
            }
        }
    ],
    tokenPayment: [
        {
            type: 'text',
            name: 'mint',
            message: 'Enter token mint address',
            validate: (input: string) => {
                try {
                    new PublicKey(input)
                    return true
                } catch {
                    return 'Invalid public key'
                }
            }
        },
        {
            type: 'number',
            name: 'amount',
            message: 'Enter token amount',
            validate: (input: string) => {
                try {
                    BigInt(input)
                    return true
                } catch {
                    return 'Invalid number'
                }
            }
        },
        {
            type: 'text',
            name: 'destinationAta',
            message: 'Enter destination ATA address',
            validate: (input: string) => {
                try {
                    new PublicKey(input)
                    return true
                } catch {
                    return 'Invalid public key'
                }
            }
        }
    ]
}
