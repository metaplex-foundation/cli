import { expect } from 'chai'
import { runCli } from '../../runCli'
import { createGenesisAccount, addPresaleBucket, getGenesisTimestamps, stripAnsi } from './genesishelpers'

describe('genesis presale workflow', () => {
    let genesisAddress: string
    let bucketAddress: string
    let depositStart: string
    let depositEnd: string
    let claimStart: string
    let claimEnd: string

    before(async () => {
        const timestamps = await getGenesisTimestamps()
        depositStart = timestamps.depositStart
        depositEnd = timestamps.depositEnd
        claimStart = timestamps.claimStart
        claimEnd = timestamps.claimEnd

        // runCli rejects on non-zero exit, so failures propagate automatically
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

    it('creates a genesis account for presale workflow', async () => {
        const result = await createGenesisAccount({
            name: 'Presale Token',
            symbol: 'PSL',
            totalSupply: '1000000000',
            decimals: 9,
        })

        genesisAddress = result.genesisAddress

        expect(genesisAddress).to.match(/^[a-zA-Z0-9]+$/)
    })

    it('adds a presale bucket to the genesis account', async () => {
        const result = await addPresaleBucket(genesisAddress, {
            allocation: '1000000000',
            quoteCap: '1000000000',
            depositStart,
            depositEnd,
            claimStart,
            claimEnd,
        })

        bucketAddress = result.bucketAddress

        expect(bucketAddress).to.match(/^[a-zA-Z0-9]+$/)
    })

    it('fetches the presale bucket details', async () => {
        const { stdout, stderr, code } = await runCli([
            'genesis',
            'bucket',
            'fetch',
            genesisAddress,
            '--bucketIndex',
            '0',
            '--type',
            'presale',
        ])

        const cleanStderr = stripAnsi(stderr)
        const cleanStdout = stripAnsi(stdout)

        expect(code).to.equal(0)
        expect(cleanStderr).to.contain('Bucket fetched successfully')
        expect(cleanStdout).to.contain('Presale Bucket')
        expect(cleanStdout).to.contain('Base Token Allocation: 1000000000')
        expect(cleanStdout).to.contain('Quote Token Cap: 1000000000')
    })

    it('finalizes the genesis account', async () => {
        const { stderr, code } = await runCli([
            'genesis',
            'finalize',
            genesisAddress,
        ])

        const cleanStderr = stripAnsi(stderr)
        expect(code).to.equal(0)
        expect(cleanStderr).to.contain('Genesis launch finalized successfully')
    })

    it('deposits into the presale bucket', async () => {
        const { stdout, stderr, code } = await runCli([
            'genesis',
            'presale',
            'deposit',
            genesisAddress,
            '--amount',
            '1000000000',
            '--bucketIndex',
            '0',
        ])

        const cleanStderr = stripAnsi(stderr)
        const cleanStdout = stripAnsi(stdout)

        expect(code).to.equal(0)
        expect(cleanStderr).to.contain('Presale deposit successful')
        expect(cleanStdout).to.contain(`Genesis Account: ${genesisAddress}`)
        expect(cleanStdout).to.contain('Amount: 1000000000')
        expect(cleanStdout).to.contain('Transaction:')
    })

    it('fails to deposit into a non-existent presale bucket', async () => {
        try {
            await runCli([
                'genesis',
                'presale',
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

    it('fails to claim from presale with no deposit', async () => {
        // Create a new genesis with a presale bucket but no deposit
        const newGenesis = await createGenesisAccount({
            name: 'No Deposit Presale',
            symbol: 'NDP',
            totalSupply: '1000000000',
        })

        await addPresaleBucket(newGenesis.genesisAddress, {
            allocation: '1000000000',
            quoteCap: '1000000000',
            depositStart,
            depositEnd,
            claimStart,
            claimEnd,
        })

        try {
            await runCli([
                'genesis',
                'presale',
                'claim',
                newGenesis.genesisAddress,
                '--bucketIndex',
                '0',
            ])
            expect.fail('Should have thrown an error for no deposit')
        } catch (error) {
            expect((error as Error).message).to.not.be.empty
        }
    })
})
