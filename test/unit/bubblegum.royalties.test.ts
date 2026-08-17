import { expect } from 'chai'
import { publicKey } from '@metaplex-foundation/umi'
import {
  parseCreatorFlags,
  parseRoyaltyPercentage,
  resolveRoyaltyMode,
  SELLER_FEE_BASIS_POINTS_INHERIT,
} from '../../src/lib/bubblegum/royalties.js'

const identity = publicKey('TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx')
const other = publicKey('11111111111111111111111111111111')

describe('bubblegum royalties helpers', () => {
  it('parses royalty percentages including decimals', () => {
    expect(parseRoyaltyPercentage('7.5')).to.equal(7.5)
    expect(parseRoyaltyPercentage(5)).to.equal(5)
    expect(parseRoyaltyPercentage(undefined)).to.equal(undefined)
    expect(() => parseRoyaltyPercentage('101')).to.throw(/between 0 and 100/)
  })

  it('defaults creators to identity @ 100', () => {
    const creators = parseCreatorFlags(undefined, identity)
    expect(creators).to.deep.equal([
      { address: identity, share: 100, verified: true },
    ])
  })

  it('parses multiple creators and requires shares to sum to 100', () => {
    const creators = parseCreatorFlags(
      [`${identity}:60`, `${other}:40`],
      identity
    )
    expect(creators.map((c) => c.share)).to.deep.equal([60, 40])
    expect(() => parseCreatorFlags([`${identity}:50`], identity)).to.throw(
      /sum to 100/
    )
  })

  it('auto-inherits when collection has royalties and no explicit override', () => {
    const mode = resolveRoyaltyMode({
      hasCollection: true,
      collectionHasRoyalties: true,
      identity,
    })
    expect(mode).to.deep.equal({ kind: 'inherit' })
  })

  it('uses explicit royalties when --royalties is set', () => {
    const mode = resolveRoyaltyMode({
      royaltyPercentage: 7.5,
      hasCollection: true,
      collectionHasRoyalties: true,
      identity,
    })
    expect(mode.kind).to.equal('explicit')
    if (mode.kind === 'explicit') {
      expect(mode.sellerFeeBasisPoints).to.equal(750)
      expect(mode.creators).to.have.length(1)
    }
  })

  it('rejects inherit without royalties plugin', () => {
    expect(() =>
      resolveRoyaltyMode({
        inheritRoyalties: true,
        hasCollection: true,
        collectionHasRoyalties: false,
        identity,
      })
    ).to.throw(/does not have a Royalties plugin/)
  })

  it('exports inherit sentinel', () => {
    expect(SELLER_FEE_BASIS_POINTS_INHERIT).to.equal(65535)
  })
})
