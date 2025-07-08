import { createCollection, fetchCollection } from '@metaplex-foundation/mpl-core'
import {
    create
} from '@metaplex-foundation/mpl-core-candy-machine'
import { generateSigner, publicKey, Umi } from '@metaplex-foundation/umi'
import { Args, Flags } from '@oclif/core'
import fs from 'node:fs'
import ora from 'ora'
import path from 'path'
import { TransactionCommand } from '../../TransactionCommand.js'
import {
    getConfigLineSettings,
    readCmConfig,
    validateCmConfig,
    writeCmConfig
} from '../../lib/cm/cm-utils.js'
import createCmTemplateFolder from '../../lib/cm/createCmTemplateFolder.js'
import insertItems from '../../lib/cm/insertItems.js'
import jsonGuardParser from '../../lib/cm/jsonGuardParser.js'
import createCandyMachinePrompt from '../../lib/cm/prompts/createCandyMachineWizardPrompt.js'
import { CandyMachineAssetCache, CandyMachineAssetCacheItem, CandyMachineConfig } from '../../lib/cm/types.js'
import uploadCandyMachineItems from '../../lib/cm/uploadItems.js'
import validateCacheUploads, { ValidateCacheUploadsOptions } from '../../lib/cm/validateCacheUploads.js'
import { createUploadProgressHandler } from '../../lib/ui/uploadProgressHandler.js'
import umiSendAndConfirmTransaction from '../../lib/umi/sendAndConfirm.js'
import uploadFiles from '../../lib/uploader/uploadFiles.js'

export default class CmCreate extends TransactionCommand<typeof CmCreate> {
    static override description = `Create an MPL Core Candy Machine using 2 different methods:

    1. Interactive Wizard: Create a Candy Machine using the interactive wizard which guides you through the process.
       Example: mplx cm create --wizard

    2. Template Directory Creation: Create a template directory for a candy machine.
       Example: mplx cm create --template

    3. Direct Creation: Create a Candy Machine in current candy machine directory.
       Example: mplx cm create

    4. Direct Creation with Directory: Create a Candy Machine in a specific candy machine directory.
       Example: mplx cm create <candy_machine_directory>
    `

    static override examples = [
        '$ mplx cm create --wizard',
        '$ mplx cm create --template',
        '$ mplx cm create',
        '$ mplx cm create <directory>',
    ]

    static override usage = 'cm create [FLAGS]'

    static override flags = {
        wizard: Flags.boolean({
            description: 'Use interactive wizard to create candy machine',
            required: false
        }),
        template: Flags.boolean({
            description: 'Create a template for the candy machine',
            required: false
        })
    }

    static override args = {
        directory: Args.string({
            description: 'The candy machine directory with a cm-config.json file',
            required: false
        })
    }

    public async run() {
        const { flags, args } = await this.parse(CmCreate)
        const { umi, explorer } = this.context

        if (flags.wizard) {
            await this.runWizard(umi);
        } else if (flags.template) {
            createCmTemplateFolder(undefined, true)
            this.logSuccess(`Template created in ${path.join(process.cwd(), 'cm-template')}`)
        } else {
            await this.runDirectCreation(umi, args.directory);
        }
    }

    private async runWizard(umi: Umi) {
        this.log(
            `--------------------------------
    
    Welcome to the Candy Machine Creator Wizard!

    This wizard will guide you through the process of creating a new candy machine.                
                
--------------------------------`
        )
        const { candyMachineConfig, assets } = await createCandyMachinePrompt()

        // Type guard for assets
        if ('error' in assets) {
            throw new Error(`Asset validation failed in wizard: ${assets.error}`)
        }

        if (!candyMachineConfig.config.collection && !assets.collectionFiles?.json && !assets.collectionFiles?.image) {
            throw new Error('No collection files found, please provide a collection.json and collection.png/jpg')
        }

        const candyMachineDir = path.join(process.cwd(), candyMachineConfig.name)
        if (!fs.existsSync(candyMachineDir)) {
            fs.mkdirSync(candyMachineDir, { recursive: true })
        }

        // Save config
        const candyMachineConfigPath = path.join(candyMachineDir, 'cm-config.json')
        fs.writeFileSync(candyMachineConfigPath, JSON.stringify(candyMachineConfig, null, 2))
        this.log(`\nConfiguration saved to: ${candyMachineConfigPath}`)

        // Create initial asset cache
        const assetCache: CandyMachineAssetCache = {
            assetItems: {}
        }

        if (!assets.imageFiles) throw new Error('No image files found')

        for (let index = 0; index < assets.imageFiles?.length; index++) {
            const jsonFile = assets.jsonFiles?.[index]
            if (!jsonFile) throw new Error(`No json path found at index ${index}`)

            const file = JSON.parse(fs.readFileSync(path.join(candyMachineDir, 'assets', jsonFile), 'utf8'))
            const name = file.name

            const assetCacheItem: CandyMachineAssetCacheItem = {
                name,
                image: assets.imageFiles[index],
                animation: assets.animationFiles?.[index],
                json: jsonFile,
                loaded: false,
            }

            assetCache.assetItems[index] = assetCacheItem
        }

        // Upload assets
        const uploadResult = await this.uploadAssets(umi, assetCache, candyMachineDir, candyMachineConfig);

        // Create collection if needed
        if (!candyMachineConfig.config.collection) {
            await this.createCollection(umi, candyMachineConfig, assets, candyMachineDir);
        }

        // Create candy machine
        await this.createCandyMachine(umi, candyMachineConfig, candyMachineDir);

        // Insert items
        const insertItemsRes = await insertItems(umi, candyMachineConfig, uploadResult.assetCache)
        fs.writeFileSync(path.join(candyMachineDir, 'asset-cache.json'), JSON.stringify(insertItemsRes.assetCache, null, 2))

        // Wizard completion message and summary (moved here after all processing is complete)
        console.log('\n🎉 Wizard complete! Here is a summary of your setup:')
        console.log(`- Directory: ${candyMachineConfig.name}`)
        if (!('error' in assets)) {
            console.log(`- Assets: ${assets.jsonFiles?.length ?? 0} JSON, ${assets.imageFiles?.length ?? 0} images, ${assets.animationFiles?.length ?? 0} animations`)
            if (assets.collectionFiles?.json) {
                const collectionJsonPath = path.join(process.cwd(), candyMachineConfig.name, 'assets', assets.collectionFiles.json)
                try {
                    const collectionJson = JSON.parse(fs.readFileSync(collectionJsonPath, 'utf8'))
                    console.log(`- Collection: ${collectionJson.name}`)
                } catch {}
            }

        }
        if (candyMachineConfig.config.collection) {
            console.log(`- Collection ID: ${candyMachineConfig.config.collection}`)
        }
        const hasGlobalGuards = candyMachineConfig.config.guardConfig && Object.keys(candyMachineConfig.config.guardConfig).length > 0
        const hasGroups = candyMachineConfig.config.groups && candyMachineConfig.config.groups.length > 0
        if (hasGlobalGuards) {
            console.log(`- Global guards: ${Object.keys(candyMachineConfig.config.guardConfig!).join(', ')}`)
        }
        if (hasGroups) {
            console.log(`- Guard groups: ${candyMachineConfig.config.groups!.map(g => g.label).join(', ')}`)
        }

        this.logSuccess(`🎉 Candy machine created successfully!`)
    }

    private async runDirectCreation(umi: Umi, directory?: string) {
        const candyMachineConfig = readCmConfig(directory);
        validateCmConfig(candyMachineConfig);

        if (candyMachineConfig.config.itemsAvailable > 0) {
            const candyMachineSpinner = ora('Creating candy machine').start()

            const candyMachineId = generateSigner(umi)
            const parsedGuards = jsonGuardParser(candyMachineConfig)

            const tx = await create(umi, {
                ...candyMachineConfig.config,
                candyMachine: candyMachineId,
                collectionUpdateAuthority: umi.identity,
                collection: publicKey(candyMachineConfig.config.collection),
                groups: parsedGuards.groups,
                guards: parsedGuards.guards,
                ...getConfigLineSettings(candyMachineConfig),
            })

            const res = await umiSendAndConfirmTransaction(umi, tx)
            console.log('Tx confirmed')

            // Write candy machine id to config file
            candyMachineConfig.candyMachineId = candyMachineId.publicKey
            writeCmConfig(candyMachineConfig, directory)

            candyMachineSpinner.succeed(`Candy machine created - ${candyMachineId.publicKey}`)
        }
    }

    private async uploadAssets(umi: Umi, assetCache: CandyMachineAssetCache, candyMachineDir: string, candyMachineConfig: CandyMachineConfig) {
        const assetCachePath = path.join(candyMachineDir, 'asset-cache.json')

        // Check if cache file exists and has all required URIs
        let uploadResult: { assetCache: CandyMachineAssetCache }
        if (fs.existsSync(assetCachePath)) {
            const existingCache = JSON.parse(fs.readFileSync(assetCachePath, 'utf8')) as CandyMachineAssetCache

            // Check if all items have required URIs
            const allItemsHaveUris = Object.values(existingCache.assetItems).every(item =>
                item.imageUri && item.jsonUri
            )

            if (allItemsHaveUris) {
                this.log(`📁 Using existing asset cache (${Object.keys(existingCache.assetItems).length} items already uploaded)`)
                uploadResult = { assetCache: existingCache }
            } else {
                this.log(`📁 Some items missing URIs, uploading missing assets...`)
                fs.writeFileSync(assetCachePath, JSON.stringify(assetCache, null, 2))
                this.log(`\nAsset cache saved to: ${assetCachePath}`)

                uploadResult = await uploadCandyMachineItems(
                    umi,
                    assetCache,
                    candyMachineDir,
                    createUploadProgressHandler()
                )

                fs.writeFileSync(assetCachePath, JSON.stringify(uploadResult.assetCache, null, 2))
                this.log(`📄 Asset metadata updated successfully`)
            }
        } else {
            fs.writeFileSync(assetCachePath, JSON.stringify(assetCache, null, 2))
            this.log(`\nAsset cache saved to: ${assetCachePath}`)

            uploadResult = await uploadCandyMachineItems(
                umi,
                assetCache,
                candyMachineDir,
                createUploadProgressHandler()
            )

            fs.writeFileSync(assetCachePath, JSON.stringify(uploadResult.assetCache, null, 2))
            this.log(`📄 Asset metadata updated successfully`)
        }

        // Validate uploads
        const validationSpinner = ora('Validating uploads...').start()
        await validateCacheUploads(uploadResult.assetCache, ValidateCacheUploadsOptions.STORAGE)
        validationSpinner.succeed('Upload validation completed')

        // Assign number of items to config
        candyMachineConfig.config.itemsAvailable = Object.keys(uploadResult.assetCache.assetItems).length

        return uploadResult;
    }

    private async createCollection(umi: Umi, candyMachineConfig: CandyMachineConfig, assets: any, candyMachineDir: string) {
        const collection = generateSigner(umi)

        // Collection image upload
        const collectionImageSpinner = ora('🖼️  Uploading collection image...').start()
        const collectionImage = await uploadFiles(umi, [path.join(candyMachineDir, 'assets', assets.collectionFiles?.image!)])
        collectionImageSpinner.succeed('Collection image uploaded')

        // Update collection json with image URI
        if (!assets.collectionFiles?.json) throw new Error('No collection json file found')

        const collectionJson = JSON.parse(fs.readFileSync(path.join(candyMachineDir, 'assets', assets.collectionFiles?.json!), 'utf8'))
        collectionJson.image = collectionImage[0].uri
        collectionJson.properties.files[0].uri = collectionImage[0].uri
        collectionJson.properties.files[0].type = collectionImage[0].mimeType
        fs.writeFileSync(path.join(candyMachineDir, 'assets', assets.collectionFiles?.json!), JSON.stringify(collectionJson, null, 2))

        // Collection metadata upload
        const collectionJsonSpinner = ora('📄 Uploading collection metadata...').start()
        const jsonUri = await uploadFiles(umi, [path.join(candyMachineDir, 'assets', assets.collectionFiles?.json!)])
        collectionJson.uri = jsonUri[0].uri
        collectionJsonSpinner.succeed('Collection metadata uploaded')

        // Collection creation onchain
        const collectionCreationSpinner = ora('🏭 Creating collection onchain...').start()
        await createCollection(umi, {
            collection,
            name: collectionJson.name,
            uri: collectionJson.uri,
        }).sendAndConfirm(umi, { send: { commitment: 'finalized' }, confirm: { commitment: 'finalized' } })

        const collectionRes = await fetchCollection(umi, collection.publicKey)

        if (!collectionRes) throw new Error('Collection not found onchain')

        // Update config with collection id
        candyMachineConfig.config.collection = collection.publicKey
        fs.writeFileSync(path.join(candyMachineDir, 'cm-config.json'), JSON.stringify(candyMachineConfig, null, 2))

        collectionCreationSpinner.succeed('Collection created')
    }

    private async createCandyMachine(umi: Umi, candyMachineConfig: CandyMachineConfig, candyMachineDir: string) {
        const candyMachineCreatorSpinner = ora('Creating candy machine').start()

        const parsedGuards = jsonGuardParser(candyMachineConfig)

        const candyMachine = generateSigner(umi)
        try {
            const tx = await create(umi, {
                candyMachine,
                collection: publicKey(candyMachineConfig.config.collection),
                collectionUpdateAuthority: umi.identity,
                itemsAvailable: candyMachineConfig.config.itemsAvailable,
                isMutable: candyMachineConfig.config.isMutable,
                ...getConfigLineSettings(candyMachineConfig),
                guards: parsedGuards.guards,
                groups: parsedGuards.groups,
            });
            await tx.sendAndConfirm(umi);
        } catch (error) {
            candyMachineCreatorSpinner.fail('Candy machine creation failed');
            console.error('Full error:', error);
            throw error;
        }

        console.log('Tx confirmed')

        // Update config with candy machine id
        candyMachineConfig.candyMachineId = candyMachine.publicKey
        fs.writeFileSync(path.join(candyMachineDir, 'cm-config.json'), JSON.stringify(candyMachineConfig, null, 2))

        candyMachineCreatorSpinner.succeed(`Candy machine created - ${candyMachine.publicKey}`)
    }
}