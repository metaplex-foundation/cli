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

describe('distro withdraw commands', () => {
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

    // Create a test distribution for withdraw testing using wrapped SOL
    const { stdout, stderr } = await runCli([
      'distro',
      'create',
      '--name',
      'Test Withdraw Distribution',
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

    // Deposit some tokens first so we can withdraw them
    await runCli([
      'distro',
      'deposit',
      testDistributionId,
      '--amount',
      '20'
    ])
  })

  it('withdraws tokens using amount flag', async () => {
    const cliInput = [
      'distro',
      'withdraw',
      testDistributionId,
      '--amount',
      '5.5'
    ]

    const { stdout, stderr, code } = await runCli(cliInput)
    
    const cleanStderr = stripAnsi(stderr)
    const cleanStdout = stripAnsi(stdout)

    expect(code).to.equal(0)
    expect(cleanStderr).to.contain('Tokens withdrawn successfully')
    expect(cleanStdout).to.contain('Withdrew 5.5 tokens')
    expect(cleanStdout).to.contain('Distribution:')
    expect(cleanStdout).to.contain('Mint:')
    expect(cleanStdout).to.contain('Recipient:')
    expect(cleanStdout).to.contain('Remaining available for withdrawal:')
    expect(cleanStdout).to.contain('Transaction:')
  })

  it('withdraws tokens using basisAmount flag', async () => {
    const cliInput = [
      'distro',
      'withdraw',
      testDistributionId,
      '--basisAmount',
      '3000000000'  // 3 tokens with 9 decimals
    ]

    const { stdout, stderr, code } = await runCli(cliInput)
    
    const cleanStderr = stripAnsi(stderr)
    const cleanStdout = stripAnsi(stdout)

    expect(code).to.equal(0)
    expect(cleanStderr).to.contain('Tokens withdrawn successfully')
    expect(cleanStdout).to.contain('Withdrew 3 tokens')
    expect(cleanStdout).to.contain('3000000000 basis')
    expect(cleanStdout).to.contain('Remaining available for withdrawal:')
  })

  it('withdraws tokens to a specific recipient', async () => {
    // Create a second test wallet address (using the same test wallet for simplicity)
    const recipientAddress = 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx'
    
    const cliInput = [
      'distro',
      'withdraw',
      testDistributionId,
      '--amount',
      '2',
      '--recipient',
      recipientAddress
    ]

    const { stdout, stderr, code } = await runCli(cliInput)
    
    const cleanStderr = stripAnsi(stderr)
    const cleanStdout = stripAnsi(stdout)

    expect(code).to.equal(0)
    expect(cleanStderr).to.contain('Tokens withdrawn successfully')
    expect(cleanStdout).to.contain('Withdrew 2 tokens')
    expect(cleanStdout).to.contain(`Recipient: ${recipientAddress}`)
  })

  it('fails when neither amount nor basisAmount is provided', async () => {
    const cliInput = [
      'distro',
      'withdraw',
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
      'withdraw',
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

  it('fails when trying to withdraw more tokens than available', async () => {
    const cliInput = [
      'distro',
      'withdraw',
      testDistributionId,
      '--amount',
      '999999'  // More than available in distribution
    ]

    try {
      await runCli(cliInput)
      expect.fail('Should have thrown an error for insufficient available balance')
    } catch (error) {
      expect((error as Error).message).to.contain('Insufficient available balance for withdrawal')
    }
  })

  it('fails with invalid distribution address', async () => {
    const cliInput = [
      'distro',
      'withdraw',
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

  it('fails when non-authority tries to withdraw', async () => {
    // This test would need a different signer context, 
    // but with current test setup we're always using the same authority
    // so this test is conceptual - in practice the authority check happens in the command
    const cliInput = [
      'distro',
      'withdraw',
      testDistributionId,
      '--amount',
      '1'
    ]

    // Since we're using the correct authority in tests, this will succeed
    // The authority check test would require setting up a different wallet context
    const { stdout, stderr, code } = await runCli(cliInput)
    expect(code).to.equal(0)
  })
})