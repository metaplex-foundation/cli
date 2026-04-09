import { expect } from 'chai'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
    addConstantProductBondingCurveBucketV2,
    addUnlockedBucketV2,
    createTimeAbsoluteCondition,
    createTriggeredCondition,
    finalizeV2,
    findBondingCurveBucketV2Pda,
    findGenesisAccountV2Pda,
    findUnlockedBucketV2Pda,
    genesis,
    initializeV2,
    WRAPPED_SOL_MINT,
} from '@metaplex-foundation/genesis'
import { mplToolbox } from '@metaplex-foundation/mpl-toolbox'
import { publicKey, signerIdentity, signerPayer, createSignerFromKeypair, generateSigner } from '@metaplex-foundation/umi'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { runCli } from '../../runCli'

// Helper to strip ANSI color codes
const stripAnsi = (str: string) => str.replace(/\u001b\[[\d;]*m/g, '')

// Helper to extract Genesis Account address from output
const extractGenesisAddress = (str: string) => {
    const patterns = [
        /Genesis Account: ([a-zA-Z0-9]+)/,
    ]

    for (const pattern of patterns) {
        const match = str.match(pattern)
        if (match) return match[1]
    }
    return null
}

// Helper to extract Base Mint address from output
const extractBaseMint = (str: string) => {
    const patterns = [
        /Base Mint: ([a-zA-Z0-9]+)/,
    ]

    for (const pattern of patterns) {
        const match = str.match(pattern)
        if (match) return match[1]
    }
    return null
}

// Helper to extract Bucket Address from output
const extractBucketAddress = (str: string) => {
    const patterns = [
        /Bucket Address: ([a-zA-Z0-9]+)/,
        /Bucket: ([a-zA-Z0-9]+)/,
    ]

    for (const pattern of patterns) {
        const match = str.match(pattern)
        if (match) return match[1]
    }
    return null
}

const createGenesisAccount = async (options?: {
    name?: string
    symbol?: string
    totalSupply?: string
    decimals?: number
}): Promise<{ genesisAddress: string; baseMint: string }> => {
    const name = options?.name ?? 'Test Token'
    const symbol = options?.symbol ?? 'TST'
    const totalSupply = options?.totalSupply ?? '1000000000'
    const decimals = options?.decimals ?? 9

    const cliInput = [
        'genesis',
        'create',
        '--name',
        name,
        '--symbol',
        symbol,
        '--totalSupply',
        totalSupply,
        '--decimals',
        decimals.toString(),
    ]

    const { stdout, stderr, code } = await runCli(cliInput)

    const cleanStderr = stripAnsi(stderr)
    const cleanStdout = stripAnsi(stdout)
    const genesisAddress = extractGenesisAddress(cleanStdout) || extractGenesisAddress(cleanStderr)
    const baseMint = extractBaseMint(cleanStdout) || extractBaseMint(cleanStderr)

    if (!genesisAddress) {
        throw new Error(`Genesis address not found in output.\nstdout: ${cleanStdout}\nstderr: ${cleanStderr}`)
    }

    if (!baseMint) {
        throw new Error(`Base mint not found in output.\nstdout: ${cleanStdout}\nstderr: ${cleanStderr}`)
    }

    expect(code).to.equal(0)
    expect(cleanStderr).to.contain('Genesis account created successfully')
    expect(genesisAddress).to.match(/^[a-zA-Z0-9]+$/)

    return { genesisAddress, baseMint }
}

const addLaunchPoolBucket = async (
    genesisAddress: string,
    options?: {
        allocation?: string
        depositStart?: string
        depositEnd?: string
        claimStart?: string
        claimEnd?: string
        endBehavior?: string[]
    }
): Promise<{ bucketAddress: string }> => {
    // Use timestamps in the past so deposits are immediately active
    const now = Math.floor(Date.now() / 1000)
    const allocation = options?.allocation ?? '500000000'
    const depositStart = options?.depositStart ?? (now - 3600).toString()
    const depositEnd = options?.depositEnd ?? (now + 86400).toString()
    const claimStart = options?.claimStart ?? (now + 86400 + 1).toString()
    const claimEnd = options?.claimEnd ?? (now + 86400 * 365).toString()

    const cliInput = [
        'genesis',
        'bucket',
        'add-launch-pool',
        genesisAddress,
        '--allocation',
        allocation,
        '--depositStart',
        depositStart,
        '--depositEnd',
        depositEnd,
        '--claimStart',
        claimStart,
        '--claimEnd',
        claimEnd,
    ]

    if (options?.endBehavior) {
        for (const eb of options.endBehavior) {
            cliInput.push('--endBehavior', eb)
        }
    }

    const { stdout, stderr, code } = await runCli(cliInput)

    const cleanStderr = stripAnsi(stderr)
    const cleanStdout = stripAnsi(stdout)
    const bucketAddress = extractBucketAddress(cleanStdout) || extractBucketAddress(cleanStderr)

    if (!bucketAddress) {
        throw new Error(`Bucket address not found in output.\nstdout: ${cleanStdout}\nstderr: ${cleanStderr}`)
    }

    expect(code).to.equal(0)
    expect(cleanStderr).to.contain('Launch pool bucket added successfully')

    return { bucketAddress }
}

const addPresaleBucket = async (
    genesisAddress: string,
    options?: {
        allocation?: string
        quoteCap?: string
        depositStart?: string
        depositEnd?: string
        claimStart?: string
        claimEnd?: string
        bucketIndex?: number
    }
): Promise<{ bucketAddress: string }> => {
    const now = Math.floor(Date.now() / 1000)
    const allocation = options?.allocation ?? '500000000'
    const quoteCap = options?.quoteCap ?? '1000000000'
    const depositStart = options?.depositStart ?? (now - 3600).toString()
    const depositEnd = options?.depositEnd ?? (now + 86400).toString()
    const claimStart = options?.claimStart ?? (now + 86400 + 1).toString()
    const claimEnd = options?.claimEnd ?? (now + 86400 * 365).toString()
    const bucketIndex = (options?.bucketIndex ?? 0).toString()

    const cliInput = [
        'genesis',
        'bucket',
        'add-presale',
        genesisAddress,
        '--allocation',
        allocation,
        '--quoteCap',
        quoteCap,
        '--depositStart',
        depositStart,
        '--depositEnd',
        depositEnd,
        '--claimStart',
        claimStart,
        '--claimEnd',
        claimEnd,
        '--bucketIndex',
        bucketIndex,
    ]

    const { stdout, stderr, code } = await runCli(cliInput)

    const cleanStderr = stripAnsi(stderr)
    const cleanStdout = stripAnsi(stdout)
    const bucketAddress = extractBucketAddress(cleanStdout) || extractBucketAddress(cleanStderr)

    if (!bucketAddress) {
        throw new Error(`Bucket address not found in output.\nstdout: ${cleanStdout}\nstderr: ${cleanStderr}`)
    }

    expect(code).to.equal(0)
    expect(cleanStderr).to.contain('Presale bucket added successfully')

    return { bucketAddress }
}

const addUnlockedBucket = async (
    genesisAddress: string,
    recipientAddress: string,
    options?: {
        allocation?: string
        claimStart?: string
        claimEnd?: string
    }
): Promise<{ bucketAddress: string }> => {
    const now = Math.floor(Date.now() / 1000)
    const allocation = options?.allocation ?? '100000000'
    const claimStart = options?.claimStart ?? (now - 3600).toString()
    const claimEnd = options?.claimEnd ?? (now + 86400 * 365).toString()

    const cliInput = [
        'genesis',
        'bucket',
        'add-unlocked',
        genesisAddress,
        '--recipient',
        recipientAddress,
        '--allocation',
        allocation,
        '--claimStart',
        claimStart,
        '--claimEnd',
        claimEnd,
    ]

    const { stdout, stderr, code } = await runCli(cliInput)

    const cleanStderr = stripAnsi(stderr)
    const cleanStdout = stripAnsi(stdout)
    const bucketAddress = extractBucketAddress(cleanStdout) || extractBucketAddress(cleanStderr)

    if (!bucketAddress) {
        throw new Error(`Bucket address not found in output.\nstdout: ${cleanStdout}\nstderr: ${cleanStderr}`)
    }

    expect(code).to.equal(0)
    expect(cleanStderr).to.contain('Unlocked bucket added successfully')

    return { bucketAddress }
}

/**
 * Creates a full bonding curve genesis on localnet matching the API defaults.
 * Uses SDK directly for all steps (genesis, bonding curve bucket, unlocked bucket).
 * Does NOT finalize — the bonding curve requires a graduation behavior (Raydium LP)
 * which can't be set up on localnet. Swaps still work on an unfinalized account.
 * Decimals = 6, total supply = 1,000,000,000 (display) = 1e15 raw.
 */
const createBondingCurveGenesis = async (options?: {
    name?: string
    symbol?: string
}): Promise<{ genesisAddress: string; baseMint: string }> => {
    const name = options?.name ?? 'BC Test Token'
    const symbol = options?.symbol ?? 'BCT'

    const TEST_RPC = 'http://127.0.0.1:8899'
    const KEYPAIR_PATH = join(process.cwd(), 'test-files', 'key.json')
    const keyBytes = new Uint8Array(JSON.parse(readFileSync(KEYPAIR_PATH, 'utf8')))

    const umi = createUmi(TEST_RPC).use(mplToolbox()).use(genesis())
    const kp = umi.eddsa.createKeypairFromSecretKey(keyBytes)
    const signer = createSignerFromKeypair(umi, kp)
    umi.use(signerIdentity(signer)).use(signerPayer(signer))

    // API defaults: decimals=6, totalSupply=1e15 raw
    const TOTAL_SUPPLY = 1000000000000000n
    const BC_SUPPLY = 717948717948717n
    const BC_VIRTUAL_BASE = 464555052790349n
    const BC_VIRTUAL_QUOTE = 55000000000n

    // Create genesis account
    const baseMintSigner = generateSigner(umi)
    const [genesisAccountPda] = findGenesisAccountV2Pda(umi, { baseMint: baseMintSigner.publicKey, index: 0 })

    await initializeV2(umi, {
        genesisAccount: genesisAccountPda,
        baseMint: baseMintSigner,
        quoteMint: publicKey(WRAPPED_SOL_MINT),
        name,
        symbol,
        uri: '',
        decimals: 6,
        totalSupplyBaseToken: TOTAL_SUPPLY,
        fundingMode: 0, // NewMint
    }).sendAndConfirm(umi)

    // Add bonding curve bucket
    await addConstantProductBondingCurveBucketV2(umi, {
        genesisAccount: genesisAccountPda,
        baseMint: baseMintSigner.publicKey,
        baseTokenAllocation: BC_SUPPLY,
        swapStartCondition: { __kind: 'Always', padding: new Array(55).fill(0), triggeredTimestamp: null },
        swapEndCondition: createTriggeredCondition(),
        virtualSol: BC_VIRTUAL_QUOTE,
        virtualTokens: BC_VIRTUAL_BASE,
    }).sendAndConfirm(umi)

    // Add unlocked bucket for remaining supply
    const remaining = TOTAL_SUPPLY - BC_SUPPLY
    const now = Math.floor(Date.now() / 1000)
    await addUnlockedBucketV2(umi, {
        genesisAccount: genesisAccountPda,
        baseMint: baseMintSigner.publicKey,
        recipient: signer.publicKey,
        baseTokenAllocation: remaining,
        claimStartCondition: createTimeAbsoluteCondition(now - 3600),
        claimEndCondition: createTimeAbsoluteCondition(now + 86400 * 365),
    }).sendAndConfirm(umi)

    return {
        genesisAddress: genesisAccountPda.toString(),
        baseMint: baseMintSigner.publicKey.toString(),
    }
}

export {
    stripAnsi,
    extractGenesisAddress,
    extractBaseMint,
    extractBucketAddress,
    createGenesisAccount,
    addLaunchPoolBucket,
    addPresaleBucket,
    addUnlockedBucket,
    createBondingCurveGenesis,
}
