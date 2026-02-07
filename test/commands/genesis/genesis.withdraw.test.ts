import { expect } from 'chai'
import { runCli } from '../../runCli'
import { createGenesisAccount, addLaunchPoolBucket, addUnlockedBucket, stripAnsi } from './genesishelpers'

describe('genesis withdraw workflow', () => {
    let genesisAddress: string
    let baseMint: string
    let bucketAddress: string
    let unlockedBucketAddress: string

    const now = Math.floor(Date.now() / 1000)
    const depositStart = (now - 3600).toString()       // 1 hour ago
    const depositEnd = (now + 86400).toString()         // 1 day from now
    const claimStart = (now + 86400 + 1).toString()     // just after deposit end
    const claimEnd = (now + 86400 * 365).toString()     // 1 year from now

    before(async () => {
        await runCli([
            "toolbox", "sol", "airdrop", "100", "TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx"
        ])

        await new Promise(resolve => setTimeout(resolve, 10000))

        await runCli([
            'toolbox',
            'sol',
            'wrap',
            '50',
        ])
    })

    it('creates a genesis account for withdraw workflow', async () => {
        const result = await createGenesisAccount({
            name: 'Withdraw Token',
            symbol: 'WTH',
            totalSupply: '1000000000',
            decimals: 9,
        })

        genesisAddress = result.genesisAddress
        baseMint = result.baseMint

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

    it('adds a launch pool bucket', async () => {
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

    it('finalizes the genesis account', async () => {
        const { stdout, stderr, code } = await runCli([
            'genesis',
            'finalize',
            genesisAddress,
        ])

        const cleanStderr = stripAnsi(stderr)
        expect(code).to.equal(0)
        expect(cleanStderr).to.contain('Genesis launch finalized successfully')
    })

    it('deposits into the launch pool', async () => {
        const { stdout, stderr, code } = await runCli([
            'genesis',
            'deposit',
            genesisAddress,
            '--amount',
            '1000000000',
            '--bucketIndex',
            '0',
        ])

        const cleanStderr = stripAnsi(stderr)
        expect(code).to.equal(0)
        expect(cleanStderr).to.contain('Deposit successful')
    })

    it('withdraws from the launch pool', async () => {
        const { stdout, stderr, code } = await runCli([
            'genesis',
            'withdraw',
            genesisAddress,
            '--amount',
            '500000000',
            '--bucketIndex',
            '0',
        ])

        const cleanStderr = stripAnsi(stderr)
        const cleanStdout = stripAnsi(stdout)

        expect(code).to.equal(0)
        expect(cleanStderr).to.contain('Withdrawal successful')
        expect(cleanStdout).to.contain(`Genesis Account: ${genesisAddress}`)
        expect(cleanStdout).to.contain('Bucket Index: 0')
        expect(cleanStdout).to.contain('Amount: 500000000')
        expect(cleanStdout).to.contain('Transaction:')
    })

    it('fails to withdraw from a non-existent bucket', async () => {
        try {
            await runCli([
                'genesis',
                'withdraw',
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

    it('fails to withdraw without a deposit', async () => {
        // Create a new genesis with a launch pool but no deposit
        const newGenesis = await createGenesisAccount({
            name: 'No Deposit Token',
            symbol: 'NDT',
            totalSupply: '1000000000',
        })

        await addLaunchPoolBucket(newGenesis.genesisAddress, {
            allocation: '500000000',
            depositStart,
            depositEnd,
            claimStart,
            claimEnd,
        })

        try {
            await runCli([
                'genesis',
                'withdraw',
                newGenesis.genesisAddress,
                '--amount',
                '1000000',
                '--bucketIndex',
                '0',
            ])
            expect.fail('Should have thrown an error for no deposit')
        } catch (error) {
            expect((error as Error).message).to.not.be.empty
        }
    })
})
