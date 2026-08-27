import { expect } from 'chai'
import {
  decodeDistributionName,
  formatTokenAmount,
} from '../../src/lib/distro/format.js'

describe('distro format helpers', () => {
  it('decodes a 32-byte padded distribution name', () => {
    const bytes = new Uint8Array(32)
    Buffer.from('CLI Distro Devnet Test').copy(bytes)
    expect(decodeDistributionName(bytes)).to.equal('CLI Distro Devnet Test')
  })

  it('formats token base units using mint decimals', () => {
    expect(formatTokenAmount(1_000_000n, 6)).to.equal('1')
    expect(formatTokenAmount(500_000n, 6)).to.equal('0.5')
    expect(formatTokenAmount(1_250_000n, 6)).to.equal('1.25')
  })
})
