import { expect } from 'chai'
import { spawn } from 'node:child_process'

import { DEVNET_RPC_URL } from '../../../src/lib/util.js'
import { CLI_PATH, KEYPAIR_PATH } from '../../runCli'

const stripAnsi = (s: string) => s.replace(/\[[\d;]*m/g, '')

// We can't reuse runCli here because it auto-appends -r TEST_RPC, which
// would override the devnet RPC this command needs to reach the Genesis
// API and run the GPA scan against devnet state.
const runCliRaw = (args: string[]) =>
    new Promise<{ stdout: string; stderr: string; code: number }>((resolve, reject) => {
        const child = spawn('node', [CLI_PATH, ...args], { stdio: ['pipe', 'pipe', 'pipe'] })
        let stdout = ''
        let stderr = ''
        child.stdout.on('data', (d) => { stdout += d.toString() })
        child.stderr.on('data', (d) => { stderr += d.toString() })
        child.on('error', reject)
        child.on('close', (code) => resolve({ stdout, stderr, code: code ?? 0 }))
    })

describe('genesis claim-creator-rewards', () => {
    // System program: a real, valid pubkey guaranteed to never be the
    // creator-fee wallet on any bucket. Exercises the full API round-trip
    // (validation, GPA scan, 400 mapping, friendly path) without needing
    // any on-chain setup or a funded keypair.
    const SYSTEM_PROGRAM = '11111111111111111111111111111111'

    it('reports no rewards for a wallet with no buckets (devnet API)', async function () {
        this.timeout(30000)

        const { stdout, stderr, code } = await runCliRaw([
            'genesis', 'claim-creator-rewards',
            '--wallet', SYSTEM_PROGRAM,
            '--network', 'solana-devnet',
            '-r', DEVNET_RPC_URL,
            '-k', KEYPAIR_PATH,
        ])

        expect(code).to.equal(0)
        const out = stripAnsi(stdout + stderr)
        expect(out).to.contain('No rewards to claim')
        expect(out).to.contain(SYSTEM_PROGRAM)
    })

    it('rejects an invalid --wallet before reaching the API', async function () {
        this.timeout(15000)

        const { stdout, stderr, code } = await runCliRaw([
            'genesis', 'claim-creator-rewards',
            '--wallet', 'not-a-pubkey',
            '-r', DEVNET_RPC_URL,
            '-k', KEYPAIR_PATH,
        ])

        expect(code).to.not.equal(0)
        const out = stripAnsi(stdout + stderr)
        expect(out).to.contain('--wallet must be a valid public key')
    })
})
