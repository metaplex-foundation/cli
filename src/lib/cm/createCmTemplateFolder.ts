import { PublicKey } from '@metaplex-foundation/umi'
import fs from 'node:fs'
import path from 'node:path'
import { CandyMachineConfig } from './types.js'
import { confirm } from '@inquirer/prompts'

async function promptOverwrite(filePath: string) {
    if (fs.existsSync(filePath)) {
        const answer = await confirm({
            message: `File ${filePath} already exists. Overwrite? (y/N): `,
            default: false
        })
        if (!answer) {
            console.log(`Skipping overwrite of ${filePath}`)
            return false
        }
    }
    return true
}

const createCmTemplateFolder = async (name?: string, fullTemplate = false) => {

    // make sure the directory exists and if not create it
    const templateDir = path.join(process.cwd(), name || 'cm-template')
    if (!fs.existsSync(templateDir)) {
        fs.mkdirSync(templateDir, { recursive: true })
    }

    // create assets directory
    const assetsDir = path.join(templateDir, 'assets')
    if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true })
    }

    if (fullTemplate) {
        // create a basic cm-config.json (not config.json)
        const configPath = path.join(templateDir, 'cm-config.json')
        if (await promptOverwrite(configPath)) {
            fs.writeFileSync(configPath, JSON.stringify({
                name: name || 'my-candy-machine',
                directory: templateDir,
                config: {
                    collection: '',
                    itemsAvailable: 1,
                    isMutable: true,
                    isSequential: false,
                    guardConfig: {},
                    groups: [
                        {
                            label: 'group1',
                            guards: {
                                solPayment: {
                                    lamports: 1000000,
                                    destination: '11111111111111111111111111111111' as PublicKey
                                }
                            }
                        },
                        {
                            label: 'group2',
                            guards: {
                                solPayment: {
                                    lamports: 4000000,
                                    destination: '11111111111111111111111111111111' as PublicKey
                                }
                            }
                        }
                    ]
                }
            } as unknown as CandyMachineConfig, null, 2))
        }

        // create file templates for metadata and image
        const metadataPath = path.join(assetsDir, '0.json')
        if (await promptOverwrite(metadataPath)) {
            fs.writeFileSync(metadataPath, JSON.stringify({
                name: `${name || 'my-candy-machine'} #0`,
                description: 'This is the first item in the candy machine',
                image: '0.png',
                external_url: 'https://example.com',
                attributes: [
                    {
                        trait_type: 'Color',
                        value: 'Red'
                    }
                ],
                properties: {
                    category: 'image',
                    files: [
                        {
                            uri: '0.png',
                            type: 'image/png'
                        }
                    ]
                }
            }, null, 2))
        }

        const collectionJsonPath = path.join(assetsDir, 'collection.json')
        if (await promptOverwrite(collectionJsonPath)) {
            fs.writeFileSync(collectionJsonPath, JSON.stringify({
                name: `Collection`,
                description: 'This is a Collection NFT Asset',
                image: 'collection.png',
                external_url: 'https://example.com',
                properties: {
                    category: 'image',
                    files: [
                        {
                            uri: 'collection.png',
                            type: 'image/png'
                        }
                    ]
                }
            }, null, 2))
        }

        // create a minimal valid PNG placeholder for asset (1x1 transparent pixel)
        const imagePath = path.join(assetsDir, '0.png')
        if (await promptOverwrite(imagePath)) {
            // Minimal valid PNG: 1x1 transparent pixel
            const minimalPng = Buffer.from([
                0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
                0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
                0x49, 0x48, 0x44, 0x52, // IHDR
                0x00, 0x00, 0x00, 0x01, // width: 1
                0x00, 0x00, 0x00, 0x01, // height: 1
                0x08, // bit depth: 8
                0x06, // color type: RGBA
                0x00, // compression: 0
                0x00, // filter: 0
                0x00, // interlace: 0
                0x1F, 0x15, 0xC4, 0x89, // IHDR CRC
                0x00, 0x00, 0x00, 0x0C, // IDAT chunk length
                0x49, 0x44, 0x41, 0x54, // IDAT
                0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // compressed data
                0xE2, 0x21, 0xBC, 0x33, // IDAT CRC
                0x00, 0x00, 0x00, 0x00, // IEND chunk length
                0x49, 0x45, 0x4E, 0x44, // IEND
                0xAE, 0x42, 0x60, 0x82  // IEND CRC
            ])
            fs.writeFileSync(imagePath, minimalPng)
            console.log('⚠️  Created placeholder image (0.png). Please replace with your actual image before uploading.')
        }

        // create a minimal valid PNG placeholder for collection (1x1 transparent pixel)
        const collectionImagePath = path.join(assetsDir, 'collection.png')
        if (await promptOverwrite(collectionImagePath)) {
            // Minimal valid PNG: 1x1 transparent pixel
            const minimalPng = Buffer.from([
                0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
                0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
                0x49, 0x48, 0x44, 0x52, // IHDR
                0x00, 0x00, 0x00, 0x01, // width: 1
                0x00, 0x00, 0x00, 0x01, // height: 1
                0x08, // bit depth: 8
                0x06, // color type: RGBA
                0x00, // compression: 0
                0x00, // filter: 0
                0x00, // interlace: 0
                0x1F, 0x15, 0xC4, 0x89, // IHDR CRC
                0x00, 0x00, 0x00, 0x0C, // IDAT chunk length
                0x49, 0x44, 0x41, 0x54, // IDAT
                0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // compressed data
                0xE2, 0x21, 0xBC, 0x33, // IDAT CRC
                0x00, 0x00, 0x00, 0x00, // IEND chunk length
                0x49, 0x45, 0x4E, 0x44, // IEND
                0xAE, 0x42, 0x60, 0x82  // IEND CRC
            ])
            fs.writeFileSync(collectionImagePath, minimalPng)
            console.log('⚠️  Created placeholder image (collection.png). Please replace with your actual collection image before uploading.')
        }
    }
}

export default createCmTemplateFolder