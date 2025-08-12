import { expect } from 'chai'
import { runCli } from '../../runCli'
import { setupTestAccount, stripAnsi } from '../../utils.js'

// Helper to extract unwrapped amount from success message
const extractUnwrappedAmount = (str: string) => {
    const match = str.match(/Unwrapped ([\d.]+) wSOL/)
    return match ? parseFloat(match[1]) : null
}

// Helper to extract signature from success message
const extractSignature = (str: string) => {
    const match = str.match(/Signature: (\w+)/)
    return match ? match[1] : null
}

describe('toolbox sol unwrap command', () => {
    before(async () => {
        await setupTestAccount("5", "TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx")
    })

    it('unwraps wSOL successfully after wrapping some SOL', async () => {
        // First wrap some SOL
        const wrapAmount = '2.0'
        await runCli([
            'toolbox',
            'sol',
            'wrap',
            wrapAmount
        ])

        // Wait for wrap transaction to settle
        await new Promise(resolve => setTimeout(resolve, 3000))

        // Now unwrap it
        const cliInput = [
            'toolbox',
            'sol',
            'unwrap'
        ]

        const { stdout, stderr, code } = await runCli(cliInput)
        const cleanStdout = stripAnsi(stdout)
        
        const unwrappedAmount = extractUnwrappedAmount(cleanStdout)
        const signature = extractSignature(cleanStdout)

        expect(code).to.equal(0)
        expect(cleanStdout).to.contain('Unwrapped')
        expect(cleanStdout).to.contain('SOL')
        expect(cleanStdout).to.contain('Token Account Closed:')
        expect(cleanStdout).to.contain('Signature:')
        expect(unwrappedAmount).to.be.a('number')
        expect(unwrappedAmount).to.be.greaterThan(0)
        expect(signature).to.be.a('string')
        expect(signature).to.have.lengthOf.greaterThan(0)
    })

    it('handles multiple wrap/unwrap cycles correctly', async () => {
        // First wrap cycle
        await runCli(['toolbox', 'sol', 'wrap', '0.5'])
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        let { stdout } = await runCli(['toolbox', 'sol', 'unwrap'])
        let cleanStdout = stripAnsi(stdout)
        expect(cleanStdout).to.contain('Unwrapped')
        
        // Wait before second cycle
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Second wrap cycle
        await runCli(['toolbox', 'sol', 'wrap', '1.0'])
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        const result = await runCli(['toolbox', 'sol', 'unwrap'])
        cleanStdout = stripAnsi(result.stdout)
        
        expect(result.code).to.equal(0)
        expect(cleanStdout).to.contain('Unwrapped')
        expect(cleanStdout).to.contain('SOL')
    })

    it('fails when no wSOL token account exists', async () => {
        // First, ensure any existing wSOL is unwrapped
        try {
            await runCli(['toolbox', 'sol', 'unwrap'])
            await new Promise(resolve => setTimeout(resolve, 3000))
        } catch (error) {
            // If it fails, that's fine - might already be unwrapped
        }

        // Try to unwrap again when no wSOL exists
        try {
            await runCli(['toolbox', 'sol', 'unwrap'])
            expect.fail('Should have thrown an error when no wSOL account exists')
        } catch (error) {
            expect((error as Error).message).to.contain('No wrapped SOL token account found')
        }
    })

    it('shows correct account closure information', async () => {
        // Wrap some SOL first
        await runCli(['toolbox', 'sol', 'wrap', '0.25'])
        await new Promise(resolve => setTimeout(resolve, 3000))

        // Now unwrap and check the output format
        const { stdout, code } = await runCli(['toolbox', 'sol', 'unwrap'])
        const cleanStdout = stripAnsi(stdout)

        expect(code).to.equal(0)
        expect(cleanStdout).to.match(/Token Account Closed: [A-Za-z0-9]{43,44}/)
        expect(cleanStdout).to.match(/Signature: [A-Za-z0-9]{64,}/)
        expect(cleanStdout).to.contain('--------------------------------')
    })
})