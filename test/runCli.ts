import { spawn } from 'child_process'
import { join } from 'path'

const CLI_PATH = join(process.cwd(), 'bin', 'run.js')

export const runCli = (args: string[], stdin?: string[]): Promise<{ stdout: string; stderr: string; code: number }> => {
    return new Promise((resolve, reject) => {
        // console.log('Spawning CLI process with args:', args)
        const child = spawn('node', [CLI_PATH, ...args, '-r', 'http://localhost:8899'], {
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
            // console.error('Process error:', error)
            reject(error)
        })

        child.on('close', (code) => {
            // console.log('Process exited with code:', code)
            resolve({ stdout, stderr, code: code || 0 })
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