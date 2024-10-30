import {runCommand} from '@oclif/test'
import {expect} from 'chai'

describe('config', () => {
  it('runs config cmd', async () => {
    const {stdout} = await runCommand('config')
    expect(stdout).to.contain('hello world')
  })

  it('runs config --name oclif', async () => {
    const {stdout} = await runCommand('config --name oclif')
    expect(stdout).to.contain('hello oclif')
  })
})
