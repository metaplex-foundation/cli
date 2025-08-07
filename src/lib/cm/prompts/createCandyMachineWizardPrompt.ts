import { checkbox, confirm, input } from '@inquirer/prompts'
import { DefaultGuardSet } from '@metaplex-foundation/mpl-core-candy-machine'
import { isPublicKey } from '@metaplex-foundation/umi'
import path from 'node:path'
import promptSelector from '../../../prompts/promptSelector.js'
import { candyGuardsSchema } from '../candyGuardsSchema.js'
import createCmTemplateFolder from '../createCmTemplateFolder.js'
import validateAssetsFolder, { ValidateAssetsResult } from '../validateAssetsFolder.js'
import { CandyMachineConfig, RawGuardConfig } from '../types.js'
import fs from 'node:fs'

const createCandyMachinePrompt = async (useCurrentDirectory: boolean = false): Promise<{ candyMachineConfig: CandyMachineConfig, assets: ValidateAssetsResult }> => {
    const candyMachineConfig: CandyMachineConfig = {
        name: '',
        directory: undefined,
        config: {
            collection: '',
            itemsAvailable: 0,
            isSequential: false,
            isMutable: true,
            guardConfig: {},
            groups: []
        }
    }

    // Helper to check for abort
    function checkAbort(val: any) {
        if (typeof val === 'string' && val.trim().toLowerCase() === 'q') {
            console.log('Aborting wizard by user request.')
            process.exit(0)
        }
        if (Array.isArray(val) && val.includes('Quit')) {
            console.log('Aborting wizard by user request.')
            process.exit(0)
        }
    }

    let targetDir: string
    
    if (useCurrentDirectory) {
        // Use current directory when assets folder is already present
        targetDir = process.cwd()
        candyMachineConfig.name = path.basename(targetDir)
    } else {
        // Prompt for directory-friendly name
        const dirName = await input({
            message: 'Directory name for your Candy Machine project? (letters, numbers, underscores, hyphens only, or q to quit)',
            validate: (value) => {
                if (value === 'q') return true
                if (/^[a-zA-Z0-9_-]+$/.test(value)) return true
                return 'Directory name must only contain letters, numbers, underscores, or hyphens. Enter "q" to quit.'
            }
        })
        checkAbort(dirName)
        candyMachineConfig.name = dirName

        // Check if directory exists and is not empty
        targetDir = path.join(process.cwd(), candyMachineConfig.name)
        const directoryExists = fs.existsSync(targetDir)
        let directoryHasFiles = false
        
        if (directoryExists) {
            const files = fs.readdirSync(targetDir)
            directoryHasFiles = files.length > 0
            if (directoryHasFiles) {
                const useExisting = await input({
                    message: `Directory "${candyMachineConfig.name}" already exists and contains ${files.length} files. Type 'y' to use, 'n' to abort, or 'q' to quit:`,
                    validate: (value) => true
                })
                checkAbort(useExisting)
                if (useExisting.trim().toLowerCase() !== 'y') {
                    console.log('Aborting wizard. Please prepare a new directory and restart the wizard.')
                    process.exit(0)
                }
            }
        }

        // Only create template folder if directory doesn't exist or is empty
        if (!directoryExists || !directoryHasFiles) {
            await createCmTemplateFolder(candyMachineConfig.name)
        }
    }

    let assets: ValidateAssetsResult

    while (true) {
        const confirmation = await input({
            message: useCurrentDirectory ? 'Press enter to continue with asset validation, or type q to abort' : 'Move your assets to the assets folder and press enter to continue, or type q to abort',
            validate: (value) => true
        })
        checkAbort(confirmation)
        if (confirmation.trim().toLowerCase() === 'q') {
            console.log('Aborting wizard by user request.')
            process.exit(0)
        }
        assets = await validateAssetsFolder(path.join(targetDir, 'assets'))
        if ('error' in assets) {
            console.log(`❌ ${assets.error}`)
            // Actionable suggestions
            if (assets.error.includes('No json files')) {
                console.log('➡️  Please add at least one asset JSON file (e.g., 0.json) to the assets folder.')
                console.log('💡  Tip: You can use "mplx cm create --template" to generate sample assets and configuration.')
            } else if (assets.error.includes('No image files')) {
                console.log('➡️  Please add at least one asset image file (e.g., 0.png) to the assets folder.')
                console.log('💡  Tip: You can use "mplx cm create --template" to generate sample assets and configuration.')
            } else if (assets.error.includes('not the same')) {
                // Mismatch in number of files
                const assetDir = path.join(targetDir, 'assets')
                const allFiles = fs.readdirSync(assetDir)
                const jsons = allFiles.filter(f => f.endsWith('.json') && !f.startsWith('collection'))
                const imgs = allFiles.filter(f => (f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.gif')) && !f.startsWith('collection'))
                const missingJsons = imgs.map(img => img.replace(/\.(png|jpg|jpeg|gif)$/i, '.json')).filter(j => !jsons.includes(j))
                const missingImgs = jsons.map(j => j.replace(/\.json$/i, '.png')).filter(i => !imgs.includes(i))
                if (missingJsons.length > 0) {
                    console.log('Missing JSON files for images:', missingJsons.join(', '))
                }
                if (missingImgs.length > 0) {
                    console.log('Missing image files for JSONs:', missingImgs.join(', '))
                }
            } else if (assets.error.includes('not named incrementing')) {
                console.log('➡️  Please ensure your asset files are named 0.json, 0.png, 1.json, 1.png, ... with no gaps or extra files.')
            }
            // Print summary of what is present
            // Can't print details if error, so just continue
        } else {
            console.log(`📁 Asset Discovery:`)
            console.log(`✔ Found ${assets.jsonFiles?.length} JSON files`)
            console.log(`✔ Found ${assets.imageFiles?.length} image files`)
            if (assets.animationFiles?.length && assets.animationFiles.length > 0) {
                console.log(`✔ Found ${assets.animationFiles.length} animation files`)
            }
            if (assets.collectionFiles?.json) {
                console.log(`✔ Found collection metadata`)
            }
            if (assets.collectionFiles?.image) {
                console.log(`✔ Found collection image`)
            }
            break
        }
    }

    // At this point, assets should be the success type (not error type)
    if (!('error' in assets)) {
        // Validate collection.json 'name' field if present
        if (assets.collectionFiles?.json) {
            const collectionJsonPath = path.join(targetDir, 'assets', assets.collectionFiles.json)
            try {
                const collectionJson = JSON.parse(fs.readFileSync(collectionJsonPath, 'utf8'))
                if (!collectionJson.name || typeof collectionJson.name !== 'string' || collectionJson.name.trim() === '') {
                    throw new Error('❌ The collection.json file is missing a valid "name" field. Please add a non-empty "name" to your collection.json and try again.')
                }
            } catch (e) {
                throw new Error('❌ Failed to read or parse collection.json. Please ensure it is valid JSON.')
            }
        }
        if (!assets.collectionFiles?.json && !assets.collectionFiles?.image) {
            const existingCollection = await input({
                message: 'No collection.json or collection.png/jpg found. Type y if using an existing collection, n to add files, or q to quit:',
                validate: (value) => true
            })
            checkAbort(existingCollection)
            if (existingCollection.trim().toLowerCase() === 'y') {
                const collectionAddr = await input({
                    message: 'Collection Address? (or q to quit)',
                    validate: (value) => {
                        if (value === 'q') return true
                        if (isPublicKey(value)) return true
                        return 'Please enter a valid Solana public key address or "q" to quit.'
                    }
                })
                checkAbort(collectionAddr)
                candyMachineConfig.config.collection = collectionAddr
            } else if (existingCollection.trim().toLowerCase() === 'q') {
                checkAbort('q')
            } else {
                while (true) {
                    const confirmation = await input({
                        message: 'Add collection.json and collection.png/jpg files to the assets folder and press enter to continue, or type q to abort',
                        validate: (value) => true
                    })
                    checkAbort(confirmation)
                    if (confirmation.trim().toLowerCase() === 'q') {
                        console.log('Aborting wizard by user request.')
                        process.exit(0)
                    }
                    const newAssets = await validateAssetsFolder(path.join(targetDir, 'assets'))
                    if (!('error' in newAssets) && newAssets.collectionFiles?.json && newAssets.collectionFiles?.image) {
                        assets = newAssets
                        // Validate collection.json 'name' field again
                        const collectionJsonPath = path.join(targetDir, 'assets', newAssets.collectionFiles.json)
                        try {
                            const collectionJson = JSON.parse(fs.readFileSync(collectionJsonPath, 'utf8'))
                            if (!collectionJson.name || typeof collectionJson.name !== 'string' || collectionJson.name.trim() === '') {
                                throw new Error('❌ The collection.json file is missing a valid "name" field. Please add a non-empty "name" to your collection.json and try again.')
                            }
                        } catch (e) {
                            throw new Error('❌ Failed to read or parse collection.json. Please ensure it is valid JSON.')
                        }
                        console.log('Collection files added')
                        break
                    } else {
                        console.log('Collection files not found')
                    }
                }
            }
        }

        candyMachineConfig.config.itemsAvailable = Number(assets.jsonFiles?.length)
    }

    // Prompt for NFT mutability
    const nftMutable = await input({
        message: 'Should the NFTs be mutable? (y/n or q to quit) [Recommend: y for flexibility]',
        validate: (value) => true
    })
    checkAbort(nftMutable)
    candyMachineConfig.config.isMutable = nftMutable.trim().toLowerCase() === 'y'

    const globalGuardsPrompt = await input({
        message: 'Do you want to create global guards? (y/n or q to quit)',
        validate: (value) => true
    })
    checkAbort(globalGuardsPrompt)
    const globalGuards = globalGuardsPrompt.trim().toLowerCase() === 'y'

    const guardChoices = Object.entries(candyGuardsSchema).map(([guard, prompts]) => guard).sort()

    if (globalGuards) {

        const selectedGlobalGuards: string[] = await checkbox({
            message: 'Select the guards to assign to global (press space to select, or select Quit to abort):',
            choices: [...guardChoices, 'Quit'],
            pageSize: 20,
            loop: false,
        })
        checkAbort(selectedGlobalGuards)

        for (const guard of selectedGlobalGuards) {
            console.log(`Configuring guard: ${guard}`)

            const answers: { [key: string]: string | number | boolean | any[] } = {}
            const promptItem = candyGuardsSchema[guard as keyof typeof candyGuardsSchema]
            for (const prompt of promptItem) {
                const res = await promptSelector(prompt)
                answers[prompt.name] = res as string | number | boolean
            }

            if (candyMachineConfig.config && !candyMachineConfig.config.guardConfig) {
                candyMachineConfig.config.guardConfig = {}
            }
            // Store raw guard data - will be parsed later by jsonGuardParser
            if (candyMachineConfig.config?.guardConfig) {
                ;(candyMachineConfig.config.guardConfig as any)[guard] = answers
            }
        }

    }

    const enableGroupsPrompt = await input({
        message: 'Do you want to create guard groups for minting? (y/n or q to quit)',
        validate: (value) => true
    })
    checkAbort(enableGroupsPrompt)
    const enableGroups = enableGroupsPrompt.trim().toLowerCase() === 'y'

    if (enableGroups) {

        const numGroupsPrompt = await input({
            message: 'Enter the number of groups (or q to quit):',
            validate: (value) => true
        })
        checkAbort(numGroupsPrompt)
        const numGroups = Number(numGroupsPrompt)

        for (let i = 0; i < numGroups; i++) {

            const groupName = await input({
                message: `Enter the name of group ${i + 1} (or q to quit):`,
                validate: (value) => true
            })
            checkAbort(groupName)

            const groupGuards: RawGuardConfig = {}

            const selectedGuards: string[] = await checkbox({
                message: `Select the guards to assign to group ${groupName} (press space to select, or select Quit to abort):`,
                choices: [...guardChoices, 'Quit'],
                pageSize: 20,
                loop: false,
            })
            checkAbort(selectedGuards)

            for (const selectedGuard of selectedGuards) {
                console.log(`Configuring guard: ${selectedGuard}`)

                const answers: { [key: string]: string | number | boolean | any[] } = {}
                const promptItem = candyGuardsSchema[selectedGuard as keyof typeof candyGuardsSchema]
                for (const prompt of promptItem) {
                    const res = await promptSelector(prompt)
                    answers[prompt.name] = res as string | number | boolean
                }

                ;(groupGuards as any)[selectedGuard] = answers
            }

            if (candyMachineConfig.config?.groups) {
                candyMachineConfig.config.groups.push({
                    label: groupName,
                    guards: groupGuards
                })
            }
        }
    }

    // Warn if no guards or groups are set
    const hasGlobalGuards = candyMachineConfig.config.guardConfig && Object.keys(candyMachineConfig.config.guardConfig).length > 0
    const hasGroups = candyMachineConfig.config.groups && candyMachineConfig.config.groups.length > 0
    if (!hasGlobalGuards && !hasGroups) {
        console.log('⚠️  Warning: You have not set any global guards or guard groups. This may result in a non-functional candy machine. Consider adding at least one guard or group.')
    }

    return { candyMachineConfig, assets }
}

export default createCandyMachinePrompt 