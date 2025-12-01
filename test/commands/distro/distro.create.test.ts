import { expect } from 'chai'
import fs from 'node:fs'
import path from 'node:path'
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

describe('distro create commands', () => {
  const testConfigPath = path.join(process.cwd(), 'test-distro-config.json')

  before(async () => {
    // Airdrop SOL for testing
    const { stdout, stderr, code } = await runCli([
      "toolbox", "sol", "airdrop", "100", "TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx"
    ])

    // Wait for airdrop to settle
    await new Promise(resolve => setTimeout(resolve, 10000))
  })

  afterEach(() => {
    // Clean up test config file if it exists
    if (fs.existsSync(testConfigPath)) {
      fs.unlinkSync(testConfigPath)
    }
  })

  it('creates a distribution with individual flag arguments', async () => {
    const cliInput = [
      'distro',
      'create',
      '--name',
      'Test Distribution',
      '--mint',
      'So11111111111111111111111111111111111111112',
      '--totalClaimants',
      '1000',
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
    ]

    const { stdout, stderr, code } = await runCli(cliInput)

    const cleanStderr = stripAnsi(stderr)
    const cleanStdout = stripAnsi(stdout)
    const distributionId = extractDistributionId(cleanStdout) || extractDistributionId(cleanStderr)

    expect(code).to.equal(0)
    expect(cleanStderr).to.contain('Distribution created successfully')
    expect(distributionId).to.match(/^[a-zA-Z0-9]+$/)
    expect(cleanStdout).to.contain('Name: Test Distribution')
    expect(cleanStdout).to.contain('Total Claimants: 1000')
    expect(cleanStdout).to.contain('Distribution Type: Wallet')
  })

  it('creates a distribution with legacy-nft type and recipient distributor', async () => {
    const cliInput = [
      'distro',
      'create',
      '--name',
      'NFT Distribution',
      '--mint',
      'So11111111111111111111111111111111111111112',
      '--totalClaimants',
      '500',
      '--startTime',
      '2024-06-01T00:00:00Z',
      '--endTime',
      '2024-06-30T23:59:59Z',
      '--merkleRoot',
      '22222222222222222222222222222222222222222222',
      '--distributionType',
      'legacy-nft',
      '--allowedDistributor',
      'recipient',
      '--subsidizeReceipts'
    ]

    const { stdout, stderr, code } = await runCli(cliInput)

    const cleanStderr = stripAnsi(stderr)
    const cleanStdout = stripAnsi(stdout)
    const distributionId = extractDistributionId(cleanStdout) || extractDistributionId(cleanStderr)

    expect(code).to.equal(0)
    expect(cleanStderr).to.contain('Distribution created successfully')
    expect(distributionId).to.match(/^[a-zA-Z0-9]+$/)
    expect(cleanStdout).to.contain('Name: NFT Distribution')
    expect(cleanStdout).to.contain('Total Claimants: 500')
    expect(cleanStdout).to.contain('Distribution Type: Legacy NFT')
  })

  it('creates a distribution using config file', async () => {
    // Create test config file
    const testConfig = {
      name: "Config File Distribution",
      mint: "So11111111111111111111111111111111111111112",
      totalClaimants: 750,
      startTime: "2024-03-01T00:00:00Z",
      endTime: "2024-09-30T23:59:59Z",
      merkleRoot: "33333333333333333333333333333333333333333333",
      distributionType: "wallet",
      subsidizeReceipts: true,
      allowedDistributor: "permissionless"
    }

    fs.writeFileSync(testConfigPath, JSON.stringify(testConfig, null, 2))

    const cliInput = [
      'distro',
      'create',
      '--distroConfig',
      testConfigPath
    ]

    const { stdout, stderr, code } = await runCli(cliInput)

    const cleanStderr = stripAnsi(stderr)
    const cleanStdout = stripAnsi(stdout)
    const distributionId = extractDistributionId(cleanStdout) || extractDistributionId(cleanStderr)

    expect(code).to.equal(0)
    expect(cleanStderr).to.contain('Distribution created successfully')
    expect(distributionId).to.match(/^[a-zA-Z0-9]+$/)
    expect(cleanStdout).to.contain('Name: Config File Distribution')
    expect(cleanStdout).to.contain('Total Claimants: 750')
    expect(cleanStdout).to.contain('Distribution Type: Wallet')
  })

  it('fails when required flags are missing', async () => {
    const cliInput = [
      'distro',
      'create',
      '--name',
      'Incomplete Distribution'
      // Missing required flags like mint, totalClaimants, etc.
    ]

    try {
      await runCli(cliInput)
      expect.fail('Should have thrown an error for missing required flags')
    } catch (error) {
      expect((error as Error).message).to.contain('Missing required flag')
    }
  })

  // Note: Wizard test would be more complex as it requires simulating user input
  // This would need a more sophisticated approach with stdin simulation
  it.skip('creates a distribution using wizard mode', async () => {
    // This test would require simulating interactive prompts
    // which is complex with the current test setup
    const cliInput = ['distro', 'create', '--wizard']

    const wizardInputs = [
      'Wizard Distribution\n',           // name
      'So11111111111111111111111111111111111111112\n', // mint
      '200\n',                          // totalClaimants
      '2024-01-01T00:00:00Z\n',         // startTime
      '2024-12-31T23:59:59Z\n',         // endTime
      '44444444444444444444444444444444444444444444\n', // merkleRoot
      '\n',                             // distributionType (default wallet)
      '\n',                             // allowedDistributor (default permissionless)
      'n\n'                             // subsidizeReceipts (no)
    ]

    const { stdout, stderr, code } = await runCli(cliInput, wizardInputs)

    const cleanStderr = stripAnsi(stderr)
    const cleanStdout = stripAnsi(stdout)
    const distributionId = extractDistributionId(cleanStdout) || extractDistributionId(cleanStderr)

    expect(code).to.equal(0)
    expect(cleanStderr).to.contain('Distribution created successfully')
    expect(distributionId).to.match(/^[a-zA-Z0-9]+$/)
  })
})