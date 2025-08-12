import { expect } from 'chai'
import { runCli } from '../../runCli'
import { shortenAddress, stripAnsi, setupTestAccount } from '../../utils.js'

// Helper to extract balance from message
const extractBalance = (str: string) => {
    const match = str.match(/Balance: ([\d.]+) SOL/)
    return match ? parseFloat(match[1]) : null
}

describe('toolbox sol balance commands', () => {
    before(async () => {
        await setupTestAccount("1", "TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx")
    })

    it('checks balance of current identity', async () => {
        const cliInput = [
            'toolbox',
            'sol',
            'balance'
        ]

        const { stdout, stderr, code } = await runCli(cliInput)

        const cleanStdout = stripAnsi(stdout)
        const balance = extractBalance(cleanStdout)

        expect(code).to.equal(0)
        expect(cleanStdout).to.contain('SOL Balance Check')
        expect(balance).to.be.a('number')
        expect(balance).to.be.greaterThanOrEqual(0)
    })

    it('checks balance of specific address', async () => {
        const testAddress = 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx'
        const cliInput = [
            'toolbox',
            'sol',
            'balance',
            testAddress
        ]

        const { stdout, stderr, code } = await runCli(cliInput)

        const cleanStdout = stripAnsi(stdout)
        const balance = extractBalance(cleanStdout)
        const shortenedAddress = shortenAddress(testAddress)

        expect(code).to.equal(0)
        expect(cleanStdout).to.contain('SOL Balance Check')
        expect(cleanStdout).to.contain(shortenedAddress)
        expect(balance).to.be.a('number')
        expect(balance).to.be.greaterThanOrEqual(0)
    })
}) 