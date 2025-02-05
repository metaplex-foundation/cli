import {runCommand} from '@oclif/test'
import {expect} from 'chai'

describe('core', () => {
  it('runs core cmd', async () => {
    const {stdout} = await runCommand('core')
    expect(stdout).to.contain('hello world')
  })

  it('runs core --name oclif', async () => {
    const {stdout} = await runCommand('core --name oclif')
    expect(stdout).to.contain('hello oclif')
  })
})
