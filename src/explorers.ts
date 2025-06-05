import { checkRpcChain, RpcChain } from "./lib/util.js"

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

export const generateExplorerUrl = async (explorer: "solanaExplorer" | "solscan" | "solanaFm", rpcUrl: string, signatureOrAccount: string, type: ExplorerLinkType): Promise<string> => {

    const chain = await checkRpcChain(rpcUrl)
    const explorerObj = explorers[explorer]
    return explorerObj.baseUrl + explorerObj[type] + signatureOrAccount + (chain === RpcChain.Mainnet ? '' : explorerObj.devnet)
}