import { expect } from 'chai'
import { publicKey } from '@metaplex-foundation/umi'
import {
  decodeDistributionName,
  distributionAddressFromPda,
  formatTokenAmount,
} from '../../src/lib/distro/format.js'

describe('distro format helpers', () => {
  it('unwraps a Pda tuple to the base58 address', () => {
    const address = publicKey('GhAZGtB8326WdU5htrc5h6cknTp3UrpJJ67mvUCkqYzx')
    expect(distributionAddressFromPda([address, 255]).toString()).to.equal(
      'GhAZGtB8326WdU5htrc5h6cknTp3UrpJJ67mvUCkqYzx',
    )
    expect(distributionAddressFromPda(address).toString()).to.equal(
      'GhAZGtB8326WdU5htrc5h6cknTp3UrpJJ67mvUCkqYzx',
    )
  })

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
