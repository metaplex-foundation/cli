import { expect } from 'chai'
import { runCli } from '../../runCli'

// Helper to strip ANSI color codes
const stripAnsi = (str: string) => str.replace(/\u001b\[\d+m/g, '')

// Helper to extract distribution ID from message
const extractDistributionId = (str: string) => {
  const patterns = [
    /Distribution created: ([a-zA-Z0-9]+)/,
    /Distribution ID: ([a-zA-Z0-9]+)/
  ]
  
  for (const pattern of patterns) {
    const match = str.match(pattern)
    if (match) return match[1]
  }
  return null
}

describe('distro deposit commands', () => {
  let testDistributionId: string
  const wsolMint = 'So11111111111111111111111111111111111111112'
  
  before(async () => {
    // Airdrop SOL for testing
    const { stdout: airdropStdout } = await runCli([
      "toolbox", "sol", "airdrop", "100", "TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx"
    ])
    
    // Wait for airdrop to settle
    await new Promise(resolve => setTimeout(resolve, 10000))

    // Wrap some SOL to get wrapped SOL tokens
    await runCli([
      'toolbox',
      'sol',
      'wrap',
      '50'
    ])

    // Create a test distribution for deposit testing using wrapped SOL
    const { stdout, stderr } = await runCli([
      'distro',
      'create',
      '--name',
      'Test Deposit Distribution',
      '--mint',
      wsolMint,
      '--totalClaimants',
      '100',
      '--startTime',
      '2024-01-01T00:00:00Z',
      '--endTime',
      '2024-12-31T23:59:59Z',
      '--merkleRoot',
      '11111111111111111111111111111111111111111111',
      '--distributionType',
      'wallet',
      '--allowedDistributor',
      'permissionless'
    ])

    const cleanStderr = stripAnsi(stderr)
    const cleanStdout = stripAnsi(stdout)
    testDistributionId = extractDistributionId(cleanStdout) || extractDistributionId(cleanStderr) || ''
    
    expect(testDistributionId).to.not.be.empty
  })

  it('deposits tokens using amount flag', async () => {
    const cliInput = [
      'distro',
      'deposit',
      testDistributionId,
      '--amount',
      '10.5'
    ]

    const { stdout, stderr, code } = await runCli(cliInput)
    
    const cleanStderr = stripAnsi(stderr)
    const cleanStdout = stripAnsi(stdout)

    expect(code).to.equal(0)
    expect(cleanStderr).to.contain('Tokens deposited successfully')
    expect(cleanStdout).to.contain('Deposited 10.5 tokens')
    expect(cleanStdout).to.contain('Distribution:')
    expect(cleanStdout).to.contain('Mint:')
    expect(cleanStdout).to.contain('Transaction:')
  })

  it('deposits tokens using basisAmount flag', async () => {
    const cliInput = [
      'distro',
      'deposit',
      testDistributionId,
      '--basisAmount',
      '5000000000'  // 5 tokens with 9 decimals
    ]

    const { stdout, stderr, code } = await runCli(cliInput)
    
    const cleanStderr = stripAnsi(stderr)
    const cleanStdout = stripAnsi(stdout)

    expect(code).to.equal(0)
    expect(cleanStderr).to.contain('Tokens deposited successfully')
    expect(cleanStdout).to.contain('Deposited 5 tokens')
    expect(cleanStdout).to.contain('5000000000 basis')
    expect(cleanStdout).to.contain('New total deposited:')
  })

  it('fails when neither amount nor basisAmount is provided', async () => {
    const cliInput = [
      'distro',
      'deposit',
      testDistributionId
    ]

    try {
      await runCli(cliInput)
      expect.fail('Should have thrown an error for missing amount flags')
    } catch (error) {
      expect((error as Error).message).to.contain('Either --amount or --basisAmount must be provided')
    }
  })

  it('fails when both amount and basisAmount are provided', async () => {
    const cliInput = [
      'distro',
      'deposit',
      testDistributionId,
      '--amount',
      '10',
      '--basisAmount',
      '1000000000'
    ]

    try {
      await runCli(cliInput)
      expect.fail('Should have thrown an error for conflicting amount flags')
    } catch (error) {
      expect((error as Error).message).to.contain('cannot be used together')
    }
  })

  it('fails when trying to deposit more tokens than available in wallet', async () => {
    const cliInput = [
      'distro',
      'deposit',
      testDistributionId,
      '--amount',
      '999999'  // More than available wrapped SOL
    ]

    try {
      await runCli(cliInput)
      expect.fail('Should have thrown an error for insufficient balance')
    } catch (error) {
      expect((error as Error).message).to.contain('Insufficient balance')
    }
  })

  it('fails with invalid distribution address', async () => {
    const cliInput = [
      'distro',
      'deposit',
      'InvalidDistributionAddress123',
      '--amount',
      '1'
    ]

    try {
      await runCli(cliInput)
      expect.fail('Should have thrown an error for invalid distribution address')
    } catch (error) {
      expect((error as Error).message).to.contain('Invalid public key')
    }
  })
})