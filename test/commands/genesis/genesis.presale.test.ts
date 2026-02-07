import { expect } from 'chai'
import { runCli } from '../../runCli'
import { createGenesisAccount, addPresaleBucket, stripAnsi } from './genesishelpers'

describe('genesis presale workflow', () => {
    let genesisAddress: string
    let baseMint: string
    let bucketAddress: string

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

    it('creates a genesis account for presale workflow', async () => {
        const result = await createGenesisAccount({
            name: 'Presale Token',
            symbol: 'PSL',
            totalSupply: '1000000000',
            decimals: 9,
        })

        genesisAddress = result.genesisAddress
        baseMint = result.baseMint

        expect(genesisAddress).to.match(/^[a-zA-Z0-9]+$/)
        expect(baseMint).to.match(/^[a-zA-Z0-9]+$/)
    })

    it('adds a presale bucket to the genesis account', async () => {
        const result = await addPresaleBucket(genesisAddress, {
            allocation: '500000000',
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
        expect(cleanStdout).to.contain('Base Token Allocation: 500000000')
        expect(cleanStdout).to.contain('Quote Token Cap: 1000000000')
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
            allocation: '500000000',
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
