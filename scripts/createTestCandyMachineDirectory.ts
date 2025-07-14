import path from "node:path"
import fs from 'node:fs'

interface CreateTestCandyMachineOptions {
    withConfig?: boolean
    withAssets?: boolean
    name?: string
    numberOfAssets?: number
    collection?: string
    uploaded?: boolean
}

const parseArgs = (): CreateTestCandyMachineOptions => {
    const args = process.argv.slice(2)
    return {
        withConfig: args.includes('--with-config'),
        withAssets: args.includes('--with-assets'),
        name: args.find(arg => arg.startsWith('--name='))?.split('=')[1] || 'candy1',
        numberOfAssets: parseInt(args.find(arg => arg.startsWith('--assets='))?.split('=')[1] || '100'),
        collection: args.find(arg => arg.startsWith('--collection='))?.split('=')[1],
        uploaded: args.includes('--uploaded')
    }
}

const createDummyConfig = (candyMachineDir: string, numberOfAssets: number, collection?: string) => {
    const config = {
        "name": "candy1",
        "config": {
          "collection": collection || "",
          "itemsAvailable": numberOfAssets,
          "isSequential": false,
          "isMutable": true,
          "guardConfig": {},
          "groups": [
            {
              "label": "test1",
              "guards": {
                "solPayment": {
                  "lamports": 100000000,
                  "destination": "4xbJp9sjeTEhheUDg8M1nJUomZcGmFZsjt9Gg3RQZAWp"
                },
                "assetBurn": {
                  "requiredCollection": "4xbJp9sjeTEhheUDg8M1nJUomZcGmFZsjt9Gg3RQZAWp"
                }
              }
            },
            {
              "label": "test2",
              "guards": {
                "solPayment": {
                  "lamports": 200000000,
                  "destination": "4xbJp9sjeTEhheUDg8M1nJUomZcGmFZsjt9Gg3RQZAWp"
                },
                "thirdPartySigner": {
                  "signerKey": "4xbJp9sjeTEhheUDg8M1nJUomZcGmFZsjt9Gg3RQZAWp"
                }
              }
            }
          ]
        }
      }
    
    const configPath = path.join(candyMachineDir, 'cm-config.json')
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), { encoding: 'utf-8' })
    console.log(`Created config file: ${configPath}`)
}

const createAssetMetadata = (index?: string, collection?: boolean) => {
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

const createDummyPNG = (): Buffer => {
    return Buffer.from([
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
}

export const createTestCandyMachineAssetDirectory = (options: CreateTestCandyMachineOptions = {}) => {
    const {
        withConfig = false,
        withAssets = false,
        name = 'candy1',
        numberOfAssets = 100,
        collection,
        uploaded = false
    } = options

    const candyMachineDir = path.join(process.cwd(), name)
    const assetsDir = path.join(candyMachineDir, 'assets')
    const cacheFile = path.join(candyMachineDir, 'asset-cache.json')

    console.log(`Creating test candy machine directory: ${candyMachineDir}`)
    console.log(`Options: withConfig=${withConfig}, withAssets=${withAssets}, assets=${numberOfAssets}, collection=${collection}, uploaded=${uploaded}`)

    // Create directory structure
    fs.mkdirSync(candyMachineDir, { recursive: true })
    fs.mkdirSync(assetsDir, { recursive: true })

    // Create assets if requested
    if (withAssets) {
        const assetCache = {
            assetItems: {} as Record<string, any>
        }

        for (let i = 0; i < numberOfAssets; i++) {
            const asset = {
                name: `Asset ${i}`,
                image: `${i}.png`,
                json: `${i}.json`,
                loaded: false,
                imageUri: uploaded ? `https://example.com/${i}.png` : undefined,
                imageType: 'image/png',
                jsonUri: uploaded ? `https://example.com/${i}.json` : undefined
            }
            assetCache.assetItems[i] = asset
        }

        // Write cache file
        fs.writeFileSync(cacheFile, JSON.stringify(assetCache, null, 2), { encoding: 'utf-8' })
        console.log(`Created asset cache: ${cacheFile}`)

        console.log(`Creating ${numberOfAssets} test assets...`)
        const imageBuffer = createDummyPNG()

        // Create individual assets
        for (const [key, asset] of Object.entries(assetCache.assetItems)) {
            fs.writeFileSync(path.join(assetsDir, `${key}.png`), imageBuffer)
            fs.writeFileSync(
                path.join(assetsDir, `${key}.json`), 
                JSON.stringify(createAssetMetadata(key), null, 2), 
                { encoding: 'utf-8' }
            )
        }

        // Create collection files
        fs.writeFileSync(
            path.join(assetsDir, 'collection.json'), 
            JSON.stringify(createAssetMetadata(undefined, true), null, 2), 
            { encoding: 'utf-8' }
        )
        fs.writeFileSync(path.join(assetsDir, 'collection.png'), imageBuffer)

        console.log(`Created ${numberOfAssets} test assets in ${assetsDir}`)
    }

    // Create config file if requested
    if (withConfig) {
        createDummyConfig(candyMachineDir, numberOfAssets, collection)
    }

    console.log(`Test candy machine directory created successfully: ${candyMachineDir}`)
}

// CLI entrypoint
if (import.meta.url === `file://${process.argv[1]}`) {
    const options = parseArgs()
    createTestCandyMachineAssetDirectory(options)
}