import {runCommand} from '@oclif/test'
import {expect} from 'chai'

describe('asset', () => {
  it('runs asset cmd', async () => {
    const {stdout} = await runCommand('asset')
    expect(stdout).to.contain('hello world')
  })

  it('runs asset --name oclif', async () => {
    const {stdout} = await runCommand('asset --name oclif')
    expect(stdout).to.contain('hello oclif')
  })
})
