import { expect } from 'chai'
import prepareJsonMetadata from '../../../src/lib/core/create/prepareJsonMetadata.js'

const imageEntry = { uri: 'https://arweave.net/image123', type: 'image/jpeg' }

describe('prepareJsonMetadata', () => {
  it('sets image and creates properties.files when properties is absent', () => {
    const json = { name: 'Test', description: 'No properties field' }
    const result = prepareJsonMetadata(json, imageEntry)

    expect(result.image).to.equal(imageEntry.uri)
    expect(result.properties?.files?.[0]).to.deep.equal(imageEntry)
  })

  it('sets image and creates files array when properties exists but has no files', () => {
    const json = { name: 'Test', properties: { category: 'image' } }
    const result = prepareJsonMetadata(json, imageEntry)

    expect(result.image).to.equal(imageEntry.uri)
    expect(result.properties?.files?.[0]).to.deep.equal(imageEntry)
  })

  it('sets image and overwrites files[0] when properties.files already exists', () => {
    const json = {
      name: 'Test',
      image: 'https://old-image.com/img.png',
      properties: {
        files: [{ uri: 'https://old-image.com/img.png', type: 'image/png' }],
      },
    }
    const result = prepareJsonMetadata(json, imageEntry)

    expect(result.image).to.equal(imageEntry.uri)
    expect(result.properties?.files?.[0]).to.deep.equal(imageEntry)
  })

  it('preserves files[1] and beyond when overwriting files[0]', () => {
    const animationEntry = { uri: 'https://arweave.net/anim456', type: 'video/mp4' }
    const json = {
      name: 'Test',
      properties: {
        files: [
          { uri: 'https://old-image.com/img.png', type: 'image/png' },
          animationEntry,
        ],
      },
    }
    const result = prepareJsonMetadata(json, imageEntry)

    expect(result.properties?.files?.[0]).to.deep.equal(imageEntry)
    expect(result.properties?.files?.[1]).to.deep.equal(animationEntry)
  })
})
