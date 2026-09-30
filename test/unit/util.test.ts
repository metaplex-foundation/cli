import { expect } from 'chai'
import { sanitizeBigInts } from '../../src/lib/util.js'

describe('sanitizeBigInts', () => {
  // DEV-193: umi/mpl-core objects carry BigInt (u64) fields (e.g. the nested
  // header.lamports.basisPoints) that crash JSON.stringify, breaking `--json`.
  // Recursion into nested objects and arrays is the behavior that fixes it.
  it('recursively converts nested and array BigInts to "n"-suffixed strings', () => {
    const input = {
      lamports: { basisPoints: 2_039_280n, identifier: 'SOL', decimals: 9 },
      plugins: [{ amount: 5n }, { amount: 0n }],
      name: 'Test',
    }
    expect(sanitizeBigInts(input)).to.deep.equal({
      lamports: { basisPoints: '2039280n', identifier: 'SOL', decimals: 9 },
      plugins: [{ amount: '5n' }, { amount: '0n' }],
      name: 'Test',
    })
  })
})
