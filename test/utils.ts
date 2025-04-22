// Key codes
export const io = {
    up: '\x1B\x5B\x41',
    down: '\x1B\x5B\x42',
    enter: '\x0D',
    space: '\x20'
}

// Link Helper

export enum LinkType {
    Transaction = 'transaction',
    Account = 'account'
}

export type Explorer = 'solanaExplorer' | 'solscan' | 'solanaFm' | 'core'

const explorer = {
    solanaExplorer: {
        transaction: 'https://explorer.solana.com/tx/',
        account: 'https://explorer.solana.com/address/',
    },
    solscan: {
        transaction: 'https://solscan.io/tx/',
        account: 'https://solscan.io/address/',
    },
    solanaFm: {
        transaction: 'https://solanafm.com/tx/',
        account: 'https://solanafm.com/address/',
    },
    core: {
        transaction: 'https://core.app/tx/',
        account: 'https://core.app/address/',
    }
}

export const explorerLink = (explorerPlatform: Explorer, type: LinkType, id: string): string => {
    return `${explorer[explorerPlatform][type]}${id}`
}


export const extractAssetId = (str: string) => {
    const match = str.match(/Asset created with ID: ([a-zA-Z0-9]+)/)
    return match ? match[1] : null
}