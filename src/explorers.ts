export const explorers = {
    solanaExplorer: {
        baseUrl: 'https://explorer.solana.com/',
        account: 'address/',
        transaction: 'tx/',
        devnet: '?cluster=devnet'
    },
    solscan: {
        baseUrl: 'https://solscan.io/',
        account: 'account/',
        transaction: 'tx/',
        devnet: '?cluster=devnet'
    },
    solanaFm: {
        baseUrl: 'https://solana.fm/',
        account: 'address/',
        transaction: 'tx/',
        devnet: '?cluster=devnet'
    },
}

interface Explorer {
    baseUrl: string
    account: string
    transaction: string
    devnet: string
}

export type ExplorerType = keyof typeof explorers
export type ExplorerLinkType = 'account' | 'transaction'

export const generateExplorerUrl = (explorer: "solanaExplorer" | "solscan" | "solanaFm", signatureOrAccount: string, type: ExplorerLinkType): string => {
    console.log(explorer)
    const explorerObj = explorers[explorer]
    console.log(explorerObj)
    return explorerObj.baseUrl + explorerObj[type] + signatureOrAccount
}