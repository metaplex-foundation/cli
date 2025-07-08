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

const createCmTemplateFolder = async (name?: string, fullTemplate: boolean = false) => {

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

        // create a basic image for asset
        const imagePath = path.join(assetsDir, '0.png')
        if (await promptOverwrite(imagePath)) {
            fs.writeFileSync(imagePath, Buffer.from([0]))
        }

        // create a basic image for collection
        const collectionImagePath = path.join(assetsDir, 'collection.png')
        if (await promptOverwrite(collectionImagePath)) {
            fs.writeFileSync(collectionImagePath, Buffer.from([0]))
        }
    }
}

export default createCmTemplateFolder