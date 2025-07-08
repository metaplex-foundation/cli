import path from "node:path"
import fs from 'node:fs'

const createTestCandyMachineAssetDirectory = () => {
    const name = 'candy1'
    const withFiles = true
    const candyMachineDir = path.join(process.cwd(), name)
    const numberOfAssets = 100

    // create cache file
    const cacheFile = path.join(candyMachineDir, 'asset-cache.json')

    // create assets directory
    const assetsDir = path.join(candyMachineDir, 'assets')

    const assetCache = {
        assetItems: {}
    }

    for (let i = 0; i < numberOfAssets; i++) {
        const asset = {
            name: `Asset ${i}`,
            image: `${i}.png`,
            json: `${i}.json`,
            loaded: false,
            imageUri: withFiles ? undefined : `https://example.com/${i}.png`,
            imageType: 'image/png',
            jsonUri: withFiles ? undefined : `https://example.com/${i}.json`
        }

        assetCache.assetItems[i] = asset
    }

    // create directory
    fs.mkdirSync(assetsDir, { recursive: true })

    // create cache file
    fs.writeFileSync(cacheFile, JSON.stringify(assetCache, null, 2), { encoding: 'utf-8', flag: 'w' })

    const assetMetadata = (index?: string, collection?: boolean) => {
        return {
            name: collection ? 'Collection' : `Asset ${index}`,
            description: collection ? 'Collection description' : `Asset ${index} description`,
            image: collection ? `https://example.com/collection.png` : `https://example.com/${index}.png`,
            attributes: [
                {
                    trait_type: 'Index',
                    value: index?.toString() || 'Collection'
                }
            ],
            properties: {
                files: [{ uri: collection ? `https://example.com/collection.png` : `https://example.com/${index}.png`, type: 'image/png' }],
                category: 'image',
            }
        }
    }

    const imageBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
        0x49, 0x48, 0x44, 0x52, // IHDR
        0x00, 0x00, 0x00, 0x01, // width: 1
        0x00, 0x00, 0x00, 0x01, // height: 1
        0x08, 0x02, 0x00, 0x00, 0x00, // bit depth, color type, compression, filter, interlace
        0x90, 0x77, 0x53, 0xDE, // IHDR CRC
        0x00, 0x00, 0x00, 0x0C, // IDAT chunk length
        0x49, 0x44, 0x41, 0x54, // IDAT
        0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // IDAT data
        0xE2, 0x21, 0xBC, 0x33, // IDAT CRC
        0x00, 0x00, 0x00, 0x00, // IEND chunk length
        0x49, 0x45, 0x4E, 0x44, // IEND
        0xAE, 0x42, 0x60, 0x82  // IEND CRC
    ])

    if (withFiles) {
        console.log(`Creating ${numberOfAssets} test assets...`)

        // create assets
        for (const [key, asset] of Object.entries(assetCache.assetItems)) {
            // Create a simple 1x1 PNG file (minimal valid PNG)
            fs.writeFileSync(path.join(assetsDir, `${key}.png`), imageBuffer)
            fs.writeFileSync(path.join(assetsDir, `${key}.json`), JSON.stringify(assetMetadata(key), null, 2), { encoding: 'utf-8', flag: 'w' })
        }

        console.log(`Created ${numberOfAssets} test assets in ${candyMachineDir}`)

        // create collection.json
        fs.writeFileSync(path.join(assetsDir, 'collection.json'), JSON.stringify(assetMetadata(undefined, true), null, 2), { encoding: 'utf-8', flag: 'w' })
        fs.writeFileSync(path.join(assetsDir, 'collection.png'), imageBuffer)
    }


}

createTestCandyMachineAssetDirectory()