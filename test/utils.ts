import { runCli } from './runCli'

export const shortenAddress = (address: string, chars = 4) => {
    return `${address.slice(0, chars)}...${address.slice(-chars)}`
}

export const stripAnsi = (str: string) => str.replace(/\u001b\[\d+m/g, '')

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const setupTestAccount = async (amount: string = "1", address: string = "TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx"): Promise<void> => {
    try {
        // Try to airdrop, but don't fail if it doesn't work (e.g., on devnet with rate limits)
        await runCli(["toolbox", "sol", "airdrop", amount, address])
        await delay(5000) // Wait for transaction to settle
    } catch (error) {
        // Airdrop might fail on devnet due to rate limits, but that's OK for most tests
        console.log(`Airdrop failed (this is expected on devnet): ${error instanceof Error ? error.message : String(error)}`)
    }
}

export const getDirectories = async (source: string) => {
    const fs = await import('fs')
    const path = await import('path')
    
    return fs.readdirSync(source, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)
}

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
    const match = str.match(/Asset: ([a-zA-Z0-9]+)/)
    return match ? match[1] : null
}