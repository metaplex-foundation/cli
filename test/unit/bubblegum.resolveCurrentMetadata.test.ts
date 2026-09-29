import { expect } from 'chai'
import { none, publicKey, some } from '@metaplex-foundation/umi'
import { TokenStandard } from '@metaplex-foundation/mpl-bubblegum'
import { resolveCurrentMetadataForUpdate } from '../../src/lib/bubblegum/resolveCurrentMetadata.js'
import { SELLER_FEE_BASIS_POINTS_INHERIT } from '../../src/lib/bubblegum/royalties.js'

const identity = publicKey('TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx')
const other = publicKey('11111111111111111111111111111111')

const leafMetadata = {
  name: 'Leaf NFT',
  symbol: 'LF',
  uri: 'https://example.com/meta.json',
  sellerFeeBasisPoints: 500,
  primarySaleHappened: false,
  isMutable: true,
  tokenStandard: some(TokenStandard.NonFungible),
  collection: none(),
  creators: [{ address: identity, share: 100, verified: true }],
}

describe('resolveCurrentMetadataForUpdate', () => {
  it('prefers currentMetadata from the SDK when present', () => {
    const currentMetadata = {
      ...leafMetadata,
      sellerFeeBasisPoints: SELLER_FEE_BASIS_POINTS_INHERIT,
      creators: [],
    }

    const resolved = resolveCurrentMetadataForUpdate({
      metadata: leafMetadata,
      currentMetadata,
    })

    expect(resolved).to.equal(currentMetadata)
  })

  it('uses the inherit sentinel when DAS reports inherited royalties', () => {
    // Display metadata shows the effective collection rate, the leaf stores the sentinel.
    const resolved = resolveCurrentMetadataForUpdate({
      metadata: leafMetadata,
      rpcAsset: {
        royalty: {
          basis_points: 500,
          basis_points_raw: SELLER_FEE_BASIS_POINTS_INHERIT,
          inherited: true,
        },
        creators_raw: [],
      },
    })

    expect(resolved.sellerFeeBasisPoints).to.equal(SELLER_FEE_BASIS_POINTS_INHERIT)
    expect(resolved.creators).to.deep.equal([])
  })

  it('falls back to empty creators when inherited and creators_raw is missing', () => {
    const resolved = resolveCurrentMetadataForUpdate({
      metadata: { ...leafMetadata, sellerFeeBasisPoints: SELLER_FEE_BASIS_POINTS_INHERIT },
      rpcAsset: { royalty: { inherited: true } },
    })

    expect(resolved.sellerFeeBasisPoints).to.equal(SELLER_FEE_BASIS_POINTS_INHERIT)
    expect(resolved.creators).to.deep.equal([])
  })

  it('keeps explicit leaf royalties when nothing is inherited', () => {
    const resolved = resolveCurrentMetadataForUpdate({ metadata: leafMetadata })

    expect(resolved.sellerFeeBasisPoints).to.equal(500)
    expect(resolved.creators).to.deep.equal(leafMetadata.creators)
  })

  it('prefers the raw leaf values over the display values', () => {
    const rawCreators = [
      { address: other, share: 40, verified: false },
      { address: identity, share: 60, verified: true },
    ]

    const resolved = resolveCurrentMetadataForUpdate({
      metadata: leafMetadata,
      rpcAsset: {
        royalty: { basis_points_raw: 750 },
        creators_raw: rawCreators,
      },
    })

    expect(resolved.sellerFeeBasisPoints).to.equal(750)
    expect(resolved.creators).to.deep.equal(rawCreators)
  })
})
