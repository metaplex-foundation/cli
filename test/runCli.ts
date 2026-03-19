import { spawn } from 'child_process'
import { join } from 'path'

export const CLI_PATH = join(process.cwd(), 'bin', 'run.js')
export const TEST_RPC = 'http://127.0.0.1:8899'
export const KEYPAIR_PATH = join(process.cwd(), 'test-files', 'key.json')

/**
 * When MPLX_TEST_WALLET_MODE=asset-signer, the test suite runs with an
 * asset-signer wallet config instead of a direct keypair. The config path
 * is set by the global setup hook in test/setup.asset-signer.ts.
 */
let assetSignerConfigPath: string | undefined

export const setAssetSignerConfig = (configPath: string) => {
    assetSignerConfigPath = configPath
}

export const isAssetSignerMode = () => process.env.MPLX_TEST_WALLET_MODE === 'asset-signer'

/**
 * Runs the CLI with the normal keypair, bypassing asset-signer mode.
 * Use this for test setup that requires operations incompatible with
 * execute CPI (e.g., creating trees, candy machines, large accounts).
 */
export const runCliDirect = (args: string[], stdin?: string[]): Promise<{ stdout: string; stderr: string; code: number }> => {
    return new Promise((resolve, reject) => {
        const child = spawn('node', [CLI_PATH, ...args, '-r', TEST_RPC, '-k', KEYPAIR_PATH], {
            stdio: ['pipe', 'pipe', 'pipe']
        })

        let stdout = ''
        let stderr = ''

        child.stdout.on('data', (data) => { stdout += data.toString() })
        child.stderr.on('data', (data) => { stderr += data.toString() })
        child.on('error', reject)
        child.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Process failed with code ${code}\nstderr: ${stderr}`))
            } else {
                resolve({ stdout, stderr, code: 0 })
            }
        })

        if (stdin) {
            for (const input of stdin) child.stdin.write(input)
            child.stdin.end()
        }
    })
}

export const runCli = (args: string[], stdin?: string[]): Promise<{ stdout: string; stderr: string; code: number }> => {
    return new Promise((resolve, reject) => {
        const cliArgs = isAssetSignerMode() && assetSignerConfigPath
            ? [CLI_PATH, ...args, '-r', TEST_RPC, '-c', assetSignerConfigPath]
            : [CLI_PATH, ...args, '-r', TEST_RPC, '-k', KEYPAIR_PATH]

        const child = spawn('node', cliArgs, {
            stdio: ['pipe', 'pipe', 'pipe']
        })

        let stdout = ''
        let stderr = ''

        child.stdout.on('data', (data) => {
            const str = data.toString()
            // console.log('stdout:', str)
            stdout += str
        })

        child.stderr.on('data', (data) => {
            const str = data.toString()
            // console.log('stderr:', str)
            stderr += str
        })

        child.on('error', (error) => {
            reject(error)
        })

        child.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Process failed with code ${code}\nstderr: ${stderr}`))
            } else {
                resolve({ stdout, stderr, code: 0 })
            }
        })

        // Handle stdin if needed
        if (stdin) {

            for (const input of stdin) {
                child.stdin.write(input)
            }
            child.stdin.end()
        }
    })
}
