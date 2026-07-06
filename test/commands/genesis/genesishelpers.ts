import { expect } from 'chai'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'

import { runCli, TEST_RPC } from '../../runCli'

// Helper to strip ANSI color codes
const stripAnsi = (str: string) => str.replace(/\u001b\[[\d;]*m/g, '')

/** Read the local validator's unix time (not wall clock — they can diverge). */
const getValidatorUnixTime = async (): Promise<number> => {
    const umi = createUmi(TEST_RPC)
    const slot = await umi.rpc.getSlot()
    const blockTime = await umi.rpc.getBlockTime(slot)

    if (blockTime === null) {
        throw new Error('Could not read validator block time')
    }

    return Number(blockTime)
}

/** Deposit/claim windows relative to the validator clock so deposits are immediately active. */
const getGenesisTimestamps = async () => {
    const now = await getValidatorUnixTime()

    return {
        claimEnd: (now + 86400 * 365).toString(),
        claimStart: (now + 86400 + 1).toString(),
        depositEnd: (now + 86400).toString(),
        depositStart: (now - 3600).toString(),
    }
}

/** Claim window that is already active on the validator clock. */
const getActiveClaimTimestamps = async () => {
    const now = await getValidatorUnixTime()

    return {
        claimEnd: (now + 86400 * 365).toString(),
        claimStart: (now - 3600).toString(),
    }
}

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
    const timestamps = await getGenesisTimestamps()
    const allocation = options?.allocation ?? '500000000'
    const depositStart = options?.depositStart ?? timestamps.depositStart
    const depositEnd = options?.depositEnd ?? timestamps.depositEnd
    const claimStart = options?.claimStart ?? timestamps.claimStart
    const claimEnd = options?.claimEnd ?? timestamps.claimEnd

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
    const timestamps = await getGenesisTimestamps()
    const allocation = options?.allocation ?? '500000000'
    const quoteCap = options?.quoteCap ?? '1000000000'
    const depositStart = options?.depositStart ?? timestamps.depositStart
    const depositEnd = options?.depositEnd ?? timestamps.depositEnd
    const claimStart = options?.claimStart ?? timestamps.claimStart
    const claimEnd = options?.claimEnd ?? timestamps.claimEnd
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
    const timestamps = await getActiveClaimTimestamps()
    const allocation = options?.allocation ?? '100000000'
    const claimStart = options?.claimStart ?? timestamps.claimStart
    const claimEnd = options?.claimEnd ?? timestamps.claimEnd

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

export {
    stripAnsi,
    extractGenesisAddress,
    extractBaseMint,
    extractBucketAddress,
    createGenesisAccount,
    addLaunchPoolBucket,
    addPresaleBucket,
    addUnlockedBucket,
    getGenesisTimestamps,
    getActiveClaimTimestamps,
    getValidatorUnixTime,
}
