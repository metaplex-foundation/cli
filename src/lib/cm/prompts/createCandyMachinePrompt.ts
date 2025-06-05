import { confirm, input, select } from '@inquirer/prompts'
import { DefaultGuardSetMintArgs } from '@metaplex-foundation/mpl-core-candy-machine'
import { isPublicKey } from '@metaplex-foundation/umi'
import { guardPrompts } from './candyGuardPromps.js'

export interface CreateCandyMachinePromptResult {
    name: string
    directory?: string
    config: {
        collection: string
        itemsAvailable: number
        isMutable: boolean
        guardConfig: Partial<DefaultGuardSetMintArgs>
    }
}

const createCandyMachinePrompt = async (): Promise<CreateCandyMachinePromptResult> => {
    const result: CreateCandyMachinePromptResult = {
        name: '',
        directory: undefined,
        config: {
            collection: '',
            itemsAvailable: 0,
            isMutable: true,
            guardConfig: {}
        }

    }

    result.name = await input({
        message: 'Candy Machine name? This will be used to create a folder for the candy machine',
        validate: (value) => {
            if (!value) return 'Name is required'
            if (!/^[a-zA-Z0-9_-]+$/.test(value)) return 'Name can only contain letters, numbers, underscores, and hyphens'
            return true
        }
    })

    result.directory = await input({
        message: 'Directory to save the candy machine? If not provided, it will be saved in the .mplx/candy-machines folder',
    })


    const existingCollection = await confirm({
        message: 'Do you have an existing collection?',
        default: false
    })

    if (!existingCollection) {
        console.log('Creating a new collection')
        // const collection = await createAssetPrompt(true)
        // result.collection = collection.collection
    } else {
        result.config.collection = await input({
            message: 'Collection Address?',
            validate: (value) => {
                if (!value) return 'Collection address is required'
                if (!isPublicKey(value)) return 'Invalid collection address'
                return true
            }
        })
    }

    // Get number of items
    result.config.itemsAvailable = Number(await input({
        message: 'Number of items available?',
        validate: (value) => {
            const num = Number(value)
            if (isNaN(num)) return 'Must be a valid number'
            if (num <= 0) return 'Must be greater than 0'
            return true
        }
    }))

    // Get mutability
    result.config.isMutable = await confirm({
        message: 'Should the candy machine be mutable?',
        default: true
    })

    // Guard configuration
    const guardChoices = Object.entries(guardPrompts).map(([guard, prompts]) => ({
        name: guard,
        value: guard,
        checked: false
    }))

    const selectedGuard = await select({
        message: 'Select a guard to enable:',
        choices: guardChoices,
    })

    // if (selectedGuard) {
    //     console.log(`Configuring guard: ${selectedGuard}`)
    //     const guardPrompt = guardPrompts[selectedGuard as keyof typeof guardPrompts]
    //     if (guardPrompt) {
    //         const answers = await guardPrompt()
    //         result.guardConfig[selectedGuard as keyof DefaultGuardSetMintArgs] = answers
    //     }
    // }

    return result
}

export default createCandyMachinePrompt 