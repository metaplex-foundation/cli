import { expect } from 'chai'
import { runCli } from '../../runCli'
import { createGenesisAccount, stripAnsi, extractGenesisAddress, extractBaseMint } from './genesishelpers'

describe('genesis create and fetch commands', () => {

    before(async () => {
        // runCli rejects on non-zero exit, so failures propagate automatically
        await runCli(
            ["toolbox", "sol", "airdrop", "100", "TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx"]
        )

        await new Promise(resolve => setTimeout(resolve, 10000))
    })

    it('creates a new genesis account with required flags', async () => {
        const cliInput = [
            'genesis',
            'create',
            '--name',
            'Test Token',
            '--symbol',
            'TST',
            '--totalSupply',
            '1000000000',
        ]

        const { stdout, stderr, code } = await runCli(cliInput)

        const cleanStderr = stripAnsi(stderr)
        const cleanStdout = stripAnsi(stdout)
        const genesisAddress = extractGenesisAddress(cleanStdout) || extractGenesisAddress(cleanStderr)

        expect(code).to.equal(0)
        expect(cleanStderr).to.contain('Genesis account created successfully')
        expect(genesisAddress).to.match(/^[a-zA-Z0-9]+$/)
        expect(cleanStdout).to.contain('Name: Test Token')
        expect(cleanStdout).to.contain('Symbol: TST')
        expect(cleanStdout).to.contain('Total Supply: 1000000000')
        expect(cleanStdout).to.contain('Decimals: 9')
        expect(cleanStdout).to.contain('Funding Mode: new-mint')
    })

    it('creates a genesis account with custom decimals', async () => {
        const cliInput = [
            'genesis',
            'create',
            '--name',
            'Six Decimal Token',
            '--symbol',
            'SDT',
            '--totalSupply',
            '500000000',
            '--decimals',
            '6',
        ]

        const { stdout, stderr, code } = await runCli(cliInput)

        const cleanStderr = stripAnsi(stderr)
        const cleanStdout = stripAnsi(stdout)

        expect(code).to.equal(0)
        expect(cleanStderr).to.contain('Genesis account created successfully')
        expect(cleanStdout).to.contain('Decimals: 6')
        expect(cleanStdout).to.contain('Name: Six Decimal Token')
        expect(cleanStdout).to.contain('Symbol: SDT')
    })

    it('creates a genesis account with a custom URI', async () => {
        const cliInput = [
            'genesis',
            'create',
            '--name',
            'URI Token',
            '--symbol',
            'URI',
            '--totalSupply',
            '1000000000',
            '--uri',
            'https://example.com/metadata.json',
        ]

        const { stdout, stderr, code } = await runCli(cliInput)

        const cleanStderr = stripAnsi(stderr)
        const cleanStdout = stripAnsi(stdout)

        expect(code).to.equal(0)
        expect(cleanStderr).to.contain('Genesis account created successfully')
    })

    it('fetches a genesis account after creation', async () => {
        const { genesisAddress } = await createGenesisAccount({
            name: 'Fetch Test Token',
            symbol: 'FTT',
            totalSupply: '2000000000',
        })

        // Wait for on-chain state
        await new Promise(resolve => setTimeout(resolve, 2000))

        const cliInput = [
            'genesis',
            'fetch',
            genesisAddress,
        ]

        const { stdout, stderr, code } = await runCli(cliInput)

        const cleanStderr = stripAnsi(stderr)
        const cleanStdout = stripAnsi(stdout)

        expect(code).to.equal(0)
        expect(cleanStderr).to.contain('Genesis account fetched successfully')
        expect(cleanStdout).to.contain(`Genesis Account: ${genesisAddress}`)
        expect(cleanStdout).to.contain('Finalized: No')
        expect(cleanStdout).to.contain('Total Supply (Base Token): 2000000000')
        expect(cleanStdout).to.contain('Funding Mode: NewMint')
        expect(cleanStdout).to.contain('Bucket Count: 0')
    })

    it('fails when required flags are missing for create', async () => {
        const cliInput = [
            'genesis',
            'create',
            '--name',
            'Incomplete Token',
            // Missing --symbol and --totalSupply
        ]

        try {
            await runCli(cliInput)
            expect.fail('Should have thrown an error for missing required flags')
        } catch (error) {
            expect((error as Error).message).to.contain('Missing required flag')
        }
    })

    it('fails when fetching a non-existent genesis account', async () => {
        const cliInput = [
            'genesis',
            'fetch',
            '11111111111111111111111111111111',
        ]

        try {
            await runCli(cliInput)
            expect.fail('Should have thrown an error for non-existent account')
        } catch (error) {
            expect((error as Error).message).to.not.be.empty
        }
    })

    it('fails with transfer funding mode when baseMint is missing', async () => {
        const cliInput = [
            'genesis',
            'create',
            '--name',
            'Transfer Token',
            '--symbol',
            'TFR',
            '--totalSupply',
            '1000000000',
            '--fundingMode',
            'transfer',
            // Missing --baseMint
        ]

        try {
            await runCli(cliInput)
            expect.fail('Should have thrown an error for missing baseMint')
        } catch (error) {
            expect((error as Error).message).to.contain('baseMint is required')
        }
    })
})
