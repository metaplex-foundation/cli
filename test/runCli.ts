import { spawn } from 'child_process'
import { join } from 'path'

const CLI_PATH = join(process.cwd(), 'bin', 'run.js')

export const runCli = (args: string[], stdin?: string[]): Promise<{ stdout: string; stderr: string; code: number }> => {
    return new Promise((resolve, reject) => {
        // console.log('Spawning CLI process with args:', args)
        const child = spawn('node', [CLI_PATH, ...args, '-r', 'http://127.0.0.1:8899', '-k', 'test-files/key.json'], {
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