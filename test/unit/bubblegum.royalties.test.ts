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
    expect(creators.map((c) => c.verified)).to.deep.equal([true, false])
    expect(() => parseCreatorFlags([`${identity}:50`], identity)).to.throw(
      /sum to 100/
    )
  })

  it('rejects malformed creator flags', () => {
    expect(() => parseCreatorFlags(['missing-share'], identity)).to.throw(
      /Expected format/
    )
    expect(() => parseCreatorFlags([`${identity}:abc`], identity)).to.throw(
      /integer from 0 to 100/
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

  it('uses explicit 0% when only creators are passed', () => {
    const creators = parseCreatorFlags([`${identity}:60`, `${other}:40`], identity)
    const mode = resolveRoyaltyMode({
      creators,
      hasCollection: true,
      collectionHasRoyalties: true,
      identity,
    })
    expect(mode.kind).to.equal('explicit')
    if (mode.kind === 'explicit') {
      expect(mode.sellerFeeBasisPoints).to.equal(0)
      expect(mode.creators).to.deep.equal(creators)
    }
  })

  it('defaults to explicit 0% when the collection has no royalties', () => {
    const mode = resolveRoyaltyMode({
      hasCollection: true,
      collectionHasRoyalties: false,
      identity,
    })
    expect(mode.kind).to.equal('explicit')
    if (mode.kind === 'explicit') {
      expect(mode.sellerFeeBasisPoints).to.equal(0)
      expect(mode.creators).to.deep.equal([
        { address: identity, share: 100, verified: true },
      ])
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

  it('rejects inherit without a collection', () => {
    expect(() =>
      resolveRoyaltyMode({
        inheritRoyalties: true,
        hasCollection: false,
        collectionHasRoyalties: false,
        identity,
      })
    ).to.throw(/requires --collection/)
  })

  it('rejects inherit combined with royalties or creators', () => {
    expect(() =>
      resolveRoyaltyMode({
        inheritRoyalties: true,
        royaltyPercentage: 5,
        hasCollection: true,
        collectionHasRoyalties: true,
        identity,
      })
    ).to.throw(/cannot be combined/)

    expect(() =>
      resolveRoyaltyMode({
        inheritRoyalties: true,
        creators: parseCreatorFlags([`${identity}:100`], identity),
        hasCollection: true,
        collectionHasRoyalties: true,
        identity,
      })
    ).to.throw(/cannot be combined/)
  })

  it('exports inherit sentinel', () => {
    expect(SELLER_FEE_BASIS_POINTS_INHERIT).to.equal(65535)
  })
})
