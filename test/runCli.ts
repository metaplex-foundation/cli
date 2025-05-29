import { spawn } from 'child_process'
import { join } from 'path'

const CLI_PATH = join(process.cwd(), 'bin', 'run.js')

export const runCli = (args: string[], stdin?: string[]): Promise<{ stdout: string; stderr: string; code: number }> => {
    return new Promise((resolve, reject) => {
        // console.log('Spawning CLI process with args:', args)
        const child = spawn('node', [CLI_PATH, ...args, '-r', 'http://127.0.0.1:8899', '-k', 'test-assets/test.json'], {
            stdio: ['pipe', 'pipe', 'pipe']
        })

        let stdout = ''
        let stderr = ''
        let hasError = false

        child.stdout.on('data', (data) => {
            const str = data.toString()
            // console.log('stdout:', str)
            stdout += str
        })

        child.stderr.on('data', (data) => {
            const str = data.toString()
            // Check if this is an actual error message
            if (str.toLowerCase().includes('error') || str.toLowerCase().includes('failed')) {
                hasError = true
            }
            // console.log('stderr:', str)
            stderr += str
        })

        child.on('error', (error) => {
            // console.error('Process error:', error)
            hasError = true
            reject(error)
        })

        child.on('close', (code) => {
            // If we have an error in stderr or non-zero exit code, treat as error
            if (hasError || code !== 0) {
                reject(new Error(`Process failed with code ${code}\nstderr: ${stderr}`))
            } else {
                // console.log('Process exited with code:', code)
                resolve({ stdout, stderr, code: code || 0 })
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