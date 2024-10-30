import {runCommand} from '@oclif/test'
import {expect} from 'chai'

describe('collection', () => {
  it('runs collection cmd', async () => {
    const {stdout} = await runCommand('collection')
    expect(stdout).to.contain('hello world')
  })

  it('runs collection --name oclif', async () => {
    const {stdout} = await runCommand('collection --name oclif')
    expect(stdout).to.contain('hello oclif')
  })
})
