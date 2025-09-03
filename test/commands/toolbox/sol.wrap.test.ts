import { expect } from 'chai'
import { runCli } from '../../runCli'

// Helper to strip ANSI color codes
const stripAnsi = (str: string) => str.replace(/\u001b\[\d+m/g, '')

// Helper to extract wrapped amount from success message
const extractWrappedAmount = (str: string) => {
    const match = str.match(/Wrapped ([\d.]+) SOL/)
    return match ? parseFloat(match[1]) : null
}

// Helper to extract signature from success message
const extractSignature = (str: string) => {
    const match = str.match(/Signature: (\w+)/)
    return match ? match[1] : null
}

describe('toolbox sol wrap command', () => {
    before(async () => {
        // Ensure we have some SOL for testing
        const { stdout, stderr, code } = await runCli([
            "toolbox", "sol", "airdrop", "10", "TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx"
        ])

        // Wait for airdrop to settle
        await new Promise(resolve => setTimeout(resolve, 5000))
    })

    it('wraps 0.1 SOL successfully', async () => {
        const amount = '0.1'
        const cliInput = [
            'toolbox',
            'sol',
            'wrap',
            amount
        ]

        const { stdout, stderr, code } = await runCli(cliInput)
        const cleanStdout = stripAnsi(stdout)

        const wrappedAmount = extractWrappedAmount(cleanStdout)
        const signature = extractSignature(cleanStdout)

        expect(code).to.equal(0)
        expect(cleanStdout).to.contain('Wrapped 0.1 SOL to wSOL')
        expect(cleanStdout).to.contain('Token Account:')
        expect(cleanStdout).to.contain('Signature:')
        expect(wrappedAmount).to.equal(0.1)
        expect(signature).to.be.a('string')
        expect(signature).to.have.lengthOf.greaterThan(0)
    })

    it('wraps 1.5 SOL successfully', async () => {
        const amount = '1.5'
        const cliInput = [
            'toolbox',
            'sol',
            'wrap',
            amount
        ]

        const { stdout, stderr, code } = await runCli(cliInput)
        const cleanStdout = stripAnsi(stdout)

        const wrappedAmount = extractWrappedAmount(cleanStdout)
        const signature = extractSignature(cleanStdout)

        expect(code).to.equal(0)
        expect(cleanStdout).to.contain('Wrapped 1.5 SOL to wSOL')
        expect(cleanStdout).to.contain('Token Account:')
        expect(cleanStdout).to.contain('Signature:')
        expect(wrappedAmount).to.equal(1.5)
        expect(signature).to.be.a('string')
    })

    it('fails with invalid amount (negative)', async () => {
        const amount = '-1'
        const cliInput = [
            'toolbox',
            'sol',
            'wrap',
            amount
        ]

        try {
            await runCli(cliInput)
            expect.fail('Should have thrown an error for negative amount')
        } catch (error) {
            expect((error as Error).message).to.contain('Amount must be a positive number')
        }
    })

    it('fails with invalid amount (zero)', async () => {
        const amount = '0'
        const cliInput = [
            'toolbox',
            'sol',
            'wrap',
            amount
        ]

        try {
            await runCli(cliInput)
            expect.fail('Should have thrown an error for zero amount')
        } catch (error) {
            expect((error as Error).message).to.contain('Amount must be a positive number')
        }
    })

    it('fails with invalid amount (non-numeric)', async () => {
        const amount = 'invalid'
        const cliInput = [
            'toolbox',
            'sol',
            'wrap',
            amount
        ]

        try {
            await runCli(cliInput)
            expect.fail('Should have thrown an error for non-numeric amount')
        } catch (error) {
            expect((error as Error).message).to.contain('Amount must be a positive number')
        }
    })

})