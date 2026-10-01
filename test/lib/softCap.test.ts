import { expect } from 'chai'

import { computeExcessRefund, validateSoftCap } from '../../src/lib/genesis/softCap.js'

describe('validateSoftCap', () => {
  it('accepts an unset soft cap', () => {
    expect(() => validateSoftCap(undefined, undefined)).to.not.throw()
    expect(() => validateSoftCap(undefined, '100')).to.not.throw()
  })

  it('accepts a soft cap above the threshold', () => {
    expect(() => validateSoftCap('200', '100')).to.not.throw()
  })

  it('accepts a soft cap equal to the threshold', () => {
    expect(() => validateSoftCap('100', '100')).to.not.throw()
  })

  it('accepts a soft cap when no threshold is set', () => {
    expect(() => validateSoftCap('1', undefined)).to.not.throw()
  })

  it('rejects a zero soft cap', () => {
    expect(() => validateSoftCap('0', undefined)).to.throw(/greater than zero/)
  })

  it('rejects a soft cap below the threshold', () => {
    expect(() => validateSoftCap('50', '100')).to.throw(/greater than or equal to/)
  })
})

describe('computeExcessRefund', () => {
  // Vectors mirror the program's own unit tests in refund_launchpool_v2.rs so
  // the CLI estimate cannot silently drift from on-chain behaviour.
  it('matches the program for the typical case', () => {
    // filled = ceil(500_000 * 1_000_000 / 1_500_000) = 333_334, excess = 166_666
    expect(computeExcessRefund(500_000n, 1_000_000n, 1_500_000n)).to.equal(166_666n)
  })

  it('leaves no dust on exact division', () => {
    expect(computeExcessRefund(250n, 1_000n, 2_000n)).to.equal(125n)
  })

  it('rounds the filled portion up', () => {
    // filled = ceil(1_000 / 3) = 334, excess = 666
    expect(computeExcessRefund(1_000n, 1n, 3n)).to.equal(666n)
  })

  it('returns zero when the pool exactly fits the cap', () => {
    expect(computeExcessRefund(500_000n, 1_000_000n, 1_000_000n)).to.equal(0n)
  })

  it('handles the numeric extreme without overflow', () => {
    const max = 2n ** 64n - 1n
    expect(computeExcessRefund(max, max, max)).to.equal(0n)
  })

  it('throws on a zero deposit total', () => {
    expect(() => computeExcessRefund(100n, 50n, 0n)).to.throw(/zero deposit total/)
  })

  it('keeps the bucket solvent across all depositors', () => {
    // Property from the program's tests: the sum of filled portions is never
    // below the cap, so refunds can never drain the bucket below graduation.
    const cap = 1_000_000n
    const scenarios = [
      [500_000n, 500_000n, 500_000n],
      [1n, 999_999n, 1_000_000n, 1n],
      [333_333n, 333_333n, 333_334n, 1_000_000n],
      [1_000_001n, 1n],
    ]

    for (const deposits of scenarios) {
      const total = deposits.reduce((a, b) => a + b, 0n)
      expect(total > cap, 'scenario must be oversubscribed').to.equal(true)

      let totalFilled = 0n
      let totalRefunded = 0n
      for (const amount of deposits) {
        const excess = computeExcessRefund(amount, cap, total)
        totalRefunded += excess
        totalFilled += amount - excess
      }

      expect(totalFilled >= cap, `sum of filled dropped below cap for ${deposits}`).to.equal(true)
      expect(totalFilled + totalRefunded).to.equal(total)
    }
  })
})
