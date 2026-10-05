import { expect } from 'chai'
import { execFile } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const CLI_PATH = path.join(process.cwd(), 'bin', 'run.js')

// `config get` does not take the shared RPC and keypair flags that runCli appends,
// so it is run directly here.
describe('config get --json', () => {
  let dir: string

  before(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mplx-config-get-'))
  })

  after(() => {
    fs.rmSync(dir, { force: true, recursive: true })
  })

  const getJson = async (config: Record<string, unknown>, key: string) => {
    const configPath = path.join(dir, `${key}.json`)
    fs.writeFileSync(configPath, JSON.stringify(config))
    const { stdout } = await execFileAsync('node', [CLI_PATH, 'config', 'get', key, '--json', '-c', configPath])
    return JSON.parse(stdout)
  }

  it('returns the key and its value', async () => {
    expect(await getJson({ rpcUrl: 'http://localhost:8899' }, 'rpcUrl')).to.deep.equal({
      key: 'rpcUrl',
      value: 'http://localhost:8899',
    })
  })

  it('keeps the value field as null when the key is missing from the config', async () => {
    expect(await getJson({ rpcUrl: 'http://localhost:8899' }, 'commitment')).to.deep.equal({
      key: 'commitment',
      value: null,
    })
  })
})
