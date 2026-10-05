import { expect } from 'chai'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const COMMANDS_DIR = path.join(process.cwd(), 'src', 'commands')

const listCommandFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return listCommandFiles(full)
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts') && entry.name !== 'index.ts' ? [full] : []
  })

// DEV-184: `--json` is the one flag agents are told to use for machine-readable
// output, so every command must support it and no command may redefine it.
describe('--json flag on every command', function () {
  this.timeout(120_000)

  it('is enabled everywhere and never redefined as a value flag', async () => {
    const missing: string[] = []
    const redefined: string[] = []
    let checked = 0

    for (const file of listCommandFiles(COMMANDS_DIR)) {
      const relative = path.relative(COMMANDS_DIR, file)
      // eslint-disable-next-line no-await-in-loop
      const mod = await import(pathToFileURL(file).href)
      const Command = mod.default as { enableJsonFlag?: boolean; flags?: Record<string, unknown> } | undefined
      if (!Command || typeof Command !== 'function') continue

      checked += 1
      if (Command.enableJsonFlag !== true) missing.push(relative)
      if (Command.flags && 'json' in Command.flags) redefined.push(relative)
    }

    expect(checked, 'no commands were discovered').to.be.greaterThan(50)
    expect(missing, `commands without enableJsonFlag: ${missing.join(', ')}`).to.deep.equal([])
    expect(redefined, `commands redefining --json: ${redefined.join(', ')}`).to.deep.equal([])
  })
})
