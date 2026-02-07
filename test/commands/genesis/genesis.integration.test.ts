import { expect } from 'chai'
import { runCli } from '../../runCli'
import { createGenesisAccount, addLaunchPoolBucket, addUnlockedBucket, stripAnsi } from './genesishelpers'

describe('genesis integration workflow', () => {
    let genesisAddress: string
    let bucketAddress: string
    let unlockedBucketAddress: string

    // Timestamps for the launch pool
    const now = Math.floor(Date.now() / 1000)
    const depositStart = (now - 3600).toString()       // 1 hour ago
    const depositEnd = (now + 86400).toString()         // 1 day from now
    const claimStart = (now + 86400 + 1).toString()     // just after deposit end
    const claimEnd = (now + 86400 * 365).toString()     // 1 year from now

    before(async () => {
        // Airdrop SOL for testing
        await runCli([
            "toolbox", "sol", "airdrop", "100", "TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx"
        ])

        await new Promise(resolve => setTimeout(resolve, 10000))

        // Wrap some SOL to get wrapped SOL tokens (needed for deposits)
        await runCli([
            'toolbox',
            'sol',
            'wrap',
            '50',
        ])
    })

    it('creates a genesis account for the workflow', async () => {
        const result = await createGenesisAccount({
            name: 'Integration Token',
            symbol: 'INT',
            totalSupply: '1000000000',
            decimals: 9,
        })

        genesisAddress = result.genesisAddress

        expect(genesisAddress).to.match(/^[a-zA-Z0-9]+$/)
    })

    it('adds an unlocked bucket as graduation destination', async () => {
        const result = await addUnlockedBucket(
            genesisAddress,
            'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx',
            {
                allocation: '0',
                claimStart,
                claimEnd,
            }
        )

        unlockedBucketAddress = result.bucketAddress

        expect(unlockedBucketAddress).to.match(/^[a-zA-Z0-9]+$/)
    })

    it('adds a launch pool bucket to the genesis account', async () => {
        const result = await addLaunchPoolBucket(genesisAddress, {
            allocation: '1000000000',
            depositStart,
            depositEnd,
            claimStart,
            claimEnd,
            endBehavior: [`${unlockedBucketAddress}:10000`],
        })

        bucketAddress = result.bucketAddress

        expect(bucketAddress).to.match(/^[a-zA-Z0-9]+$/)
    })

    it('fetches the genesis account and verifies bucket was added', async () => {
        await new Promise(resolve => setTimeout(resolve, 2000))

        const { stdout, stderr, code } = await runCli([
            'genesis',
            'fetch',
            genesisAddress,
        ])

        const cleanStderr = stripAnsi(stderr)
        const cleanStdout = stripAnsi(stdout)

        expect(code).to.equal(0)
        expect(cleanStderr).to.contain('Genesis account fetched successfully')
        expect(cleanStdout).to.contain(`Genesis Account: ${genesisAddress}`)
        expect(cleanStdout).to.contain('Bucket Count: 2')
        expect(cleanStdout).to.contain('Finalized: No')
    })

    it('fetches the launch pool bucket details', async () => {
        const { stdout, stderr, code } = await runCli([
            'genesis',
            'bucket',
            'fetch',
            genesisAddress,
            '--bucketIndex',
            '0',
        ])

        const cleanStderr = stripAnsi(stderr)
        const cleanStdout = stripAnsi(stdout)

        expect(code).to.equal(0)
        expect(cleanStderr).to.contain('Bucket fetched successfully')
        expect(cleanStdout).to.contain('Launch Pool Bucket')
        expect(cleanStdout).to.contain('Base Token Allocation: 1000000000')
        expect(cleanStdout).to.contain('Deposit Count: 0')
        expect(cleanStdout).to.contain('Claim Count: 0')
    })

    it('finalizes the genesis launch', async () => {
        const { stdout, stderr, code } = await runCli([
            'genesis',
            'finalize',
            genesisAddress,
        ])

        const cleanStderr = stripAnsi(stderr)
        const cleanStdout = stripAnsi(stdout)

        expect(code).to.equal(0)
        expect(cleanStderr).to.contain('Genesis launch finalized successfully')
        expect(cleanStdout).to.contain(`Genesis Account: ${genesisAddress}`)
        expect(cleanStdout).to.contain('Status: Finalized')
        expect(cleanStdout).to.contain('Transaction:')
    })

    it('deposits into the launch pool', async () => {
        const { stdout, stderr, code } = await runCli([
            'genesis',
            'deposit',
            genesisAddress,
            '--amount',
            '1000000000',  // 1 SOL in lamports
            '--bucketIndex',
            '0',
        ])

        const cleanStderr = stripAnsi(stderr)
        const cleanStdout = stripAnsi(stdout)

        expect(code).to.equal(0)
        expect(cleanStderr).to.contain('Deposit successful')
        expect(cleanStdout).to.contain(`Genesis Account: ${genesisAddress}`)
        expect(cleanStdout).to.contain('Bucket Index: 0')
        expect(cleanStdout).to.contain('Amount: 1000000000')
        expect(cleanStdout).to.contain('Transaction:')
    })

    it('verifies the genesis account is now finalized', async () => {
        await new Promise(resolve => setTimeout(resolve, 2000))

        const { stdout, stderr, code } = await runCli([
            'genesis',
            'fetch',
            genesisAddress,
        ])

        const cleanStderr = stripAnsi(stderr)
        const cleanStdout = stripAnsi(stdout)

        expect(code).to.equal(0)
        expect(cleanStdout).to.contain('Finalized: Yes')
    })

    it('fails to finalize an already-finalized genesis account', async () => {
        try {
            await runCli([
                'genesis',
                'finalize',
                genesisAddress,
            ])
            expect.fail('Should have thrown an error for already-finalized account')
        } catch (error) {
            expect((error as Error).message).to.contain('already been finalized')
        }
    })

    it('fails to add a bucket to a finalized genesis account', async () => {
        try {
            await runCli([
                'genesis',
                'bucket',
                'add-launch-pool',
                genesisAddress,
                '--allocation',
                '100000000',
                '--depositStart',
                depositStart,
                '--depositEnd',
                depositEnd,
                '--claimStart',
                claimStart,
                '--claimEnd',
                claimEnd,
            ])
            expect.fail('Should have thrown an error for finalized account')
        } catch (error) {
            expect((error as Error).message).to.contain('finalized')
        }
    })

    it('revokes mint authority', async () => {
        const { stdout, stderr, code } = await runCli([
            'genesis',
            'revoke',
            genesisAddress,
            '--revokeMint',
        ])

        const cleanStderr = stripAnsi(stderr)
        const cleanStdout = stripAnsi(stdout)

        expect(code).to.equal(0)
        expect(cleanStderr).to.contain('Authorities revoked successfully')
        expect(cleanStdout).to.contain('Mint Authority Revoked: Yes')
        expect(cleanStdout).to.contain('Freeze Authority Revoked: No')
        expect(cleanStdout).to.contain('WARNING')
    })

    it('fails when no revoke flag is specified', async () => {
        try {
            await runCli([
                'genesis',
                'revoke',
                genesisAddress,
            ])
            expect.fail('Should have thrown an error when no revoke flag is specified')
        } catch (error) {
            expect((error as Error).message).to.contain('revokeMint')
        }
    })

    it('fails to deposit into a non-existent bucket', async () => {
        try {
            await runCli([
                'genesis',
                'deposit',
                genesisAddress,
                '--amount',
                '1000000',
                '--bucketIndex',
                '99',
            ])
            expect.fail('Should have thrown an error for non-existent bucket')
        } catch (error) {
            expect((error as Error).message).to.not.be.empty
        }
    })

    it('fails to fetch a non-existent bucket', async () => {
        try {
            await runCli([
                'genesis',
                'bucket',
                'fetch',
                genesisAddress,
                '--bucketIndex',
                '99',
            ])
            expect.fail('Should have thrown an error for non-existent bucket')
        } catch (error) {
            expect((error as Error).message).to.contain('not found')
        }
    })
})

describe('genesis unlocked bucket workflow', () => {
    let genesisAddress: string

    const now = Math.floor(Date.now() / 1000)
    const claimStart = (now - 3600).toString()          // 1 hour ago (so claim is active)
    const claimEnd = (now + 86400 * 365).toString()     // 1 year from now

    before(async () => {
        await runCli([
            "toolbox", "sol", "airdrop", "100", "TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx"
        ])

        await new Promise(resolve => setTimeout(resolve, 10000))
    })

    it('creates a genesis account with unlocked bucket', async () => {
        const result = await createGenesisAccount({
            name: 'Unlocked Token',
            symbol: 'UNL',
            totalSupply: '1000000000',
            decimals: 9,
        })

        genesisAddress = result.genesisAddress

        expect(genesisAddress).to.match(/^[a-zA-Z0-9]+$/)
    })

    it('adds an unlocked bucket', async () => {
        const result = await addUnlockedBucket(
            genesisAddress,
            'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx',
            {
                allocation: '100000000',
                claimStart,
                claimEnd,
            }
        )

        expect(result.bucketAddress).to.match(/^[a-zA-Z0-9]+$/)
    })

    it('fetches the unlocked bucket details', async () => {
        const { stdout, stderr, code } = await runCli([
            'genesis',
            'bucket',
            'fetch',
            genesisAddress,
            '--bucketIndex',
            '0',
            '--type',
            'unlocked',
        ])

        const cleanStderr = stripAnsi(stderr)
        const cleanStdout = stripAnsi(stdout)

        expect(code).to.equal(0)
        expect(cleanStderr).to.contain('Bucket fetched successfully')
        expect(cleanStdout).to.contain('Unlocked Bucket')
        expect(cleanStdout).to.contain('Base Token Allocation: 100000000')
        expect(cleanStdout).to.contain('Claimed: No')
    })

    it('fails to claim unlocked bucket before finalization', async () => {
        try {
            await runCli([
                'genesis',
                'claim-unlocked',
                genesisAddress,
                '--bucketIndex',
                '0',
            ])
            expect.fail('Should have thrown an error before finalization')
        } catch (error) {
            expect((error as Error).message).to.not.be.empty
        }
    })
})
