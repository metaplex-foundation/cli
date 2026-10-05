import { expect } from 'chai'

import { runCli } from '../../runCli'

// DEV-184: `--json` is the standard output flag on every command. On
// `bg nft create` it used to carry the metadata file path; that is now `--offchain`.
// These checks fail during argument parsing, so no validator is needed.
// runCli rejects on a non-zero exit code, with the process output in the message.
const runExpectingFailure = async (args: string[]): Promise<string> => {
  try {
    await runCli(args)
  } catch (error) {
    return (error as Error).message
  }

  throw new Error(`Expected "mplx ${args.join(' ')}" to fail`)
}

describe('bg nft create flag handling', () => {
  it('lists --offchain and the boolean --json in help', async () => {
    const { code, stdout } = await runCli(['bg', 'nft', 'create', '--help'])

    expect(code).to.equal(0)
    expect(stdout).to.match(/--offchain=<value>\s+Path to JSON metadata file/)
    expect(stdout).to.match(/--json\s+Format output as json/)
  })

  it('rejects the old --json <path> usage with a hint to use --offchain', async () => {
    const output = await runExpectingFailure([
      'bg', 'nft', 'create', 'some-tree',
      '--image', './image.png',
      '--json', './metadata.json',
    ])

    expect(output).to.contain('Unexpected argument')
    expect(output).to.contain('Pass the metadata file with --offchain <path>')
  })

  it('requires --image with --offchain', async () => {
    const output = await runExpectingFailure([
      'bg', 'nft', 'create', 'some-tree',
      '--offchain', './metadata.json',
    ])

    expect(output).to.contain('--image')
  })

  it('does not show the --json hint when no path follows --json', async () => {
    const output = await runExpectingFailure([
      'bg', 'nft', 'create', 'some-tree', 'stray-argument', '--json',
    ])

    expect(output).to.contain('Unexpected argument')
    expect(output).to.not.contain('--offchain <path>')
  })

  it('does not show the --json hint when --offchain is already used', async () => {
    const output = await runExpectingFailure([
      'bg', 'nft', 'create', 'some-tree',
      '--image', './image.png', '--offchain', './metadata.json',
      '--json', 'stray-argument',
    ])

    expect(output).to.contain('Unexpected argument')
    expect(output).to.not.contain('Pass the metadata file with --offchain <path>')
  })
})
