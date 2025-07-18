import { input, confirm, number } from "@inquirer/prompts"
import { isPublicKey } from "@metaplex-foundation/umi"

export type PromptItemType = 'number' | 'string' | 'boolean' | 'publicKey' | 'date' | 'array'

export interface PromptItem {
    prompt: string
    name: string
    type: PromptItemType
    required?: boolean
    items?: PromptItemType
    validate?: (value: string | number | boolean) => boolean | string
}

// Helper function to validate individual array items
const validateArrayItem = (item: any, itemType: PromptItemType): boolean | string => {
    switch (itemType) {
        case 'string':
            if (typeof item !== 'string') return 'must be a string'
            return true
        case 'number':
            if (typeof item !== 'number' || isNaN(item)) return 'must be a number'
            if (item < 0) return 'must be a non-negative number'
            return true
        case 'boolean':
            if (typeof item !== 'boolean') return 'must be a boolean'
            return true
        case 'publicKey':
            if (typeof item !== 'string') return 'must be a string'
            if (!isPublicKey(item)) return 'must be a valid public key'
            return true
        case 'date': {
            if (typeof item !== 'string') return 'must be a string'
            const dateValue = new Date(item)
            if (isNaN(dateValue.getTime())) return 'must be a valid date'
            return true
        }
        case 'array':
            if (!Array.isArray(item)) return 'must be an array'
            return true
        default:
            return `unsupported item type: ${itemType}`
    }
}


const promptSelector = async (promptItem: PromptItem) => {


    switch (promptItem.type) {
        case 'number':
            return await number({
                message: promptItem.prompt,
                validate: (value) => {
                    if (promptItem.required && (value === null || value === undefined)) return 'Value is required'
                    if (value === undefined || value === null || isNaN(value)) return 'Please enter a valid number'
                    if (value < 0) return 'Please enter a non-negative number'
                    return true
                },
            })
        case 'string':
            return await input({
                message: promptItem.prompt,
                validate: (value) => {
                    if (promptItem.required && !value) return 'Value is required'
                    return true
                },
            })
        case 'boolean':
            return await confirm({
                message: promptItem.prompt,
            })
        case 'publicKey':
            return await input({
                message: promptItem.prompt,
                validate: (value) => {
                    if (promptItem.required && !value) return 'Value is required'
                    if (isPublicKey(value)) return true
                    return 'Value must be a valid public key'
                },
            })
        case 'date':
            return await input({
                message: promptItem.prompt,
                validate: (value) => {
                    if (promptItem.required && !value) return 'Value is required'
                    const dateValue = new Date(value)
                    if (isNaN(dateValue.getTime())) return 'Please enter a valid date (e.g., 2023-12-31, Dec 31 2023)'
                    return true
                },
            })
        case 'array':
            return await input({
                message: promptItem.prompt,
                validate: (value) => {
                    if (promptItem.required && !value) return 'Value is required'
                    if (!value) return true // Allow empty if not required
                    
                    // Try to parse as JSON array
                    let parsedArray
                    try {
                        parsedArray = JSON.parse(value)
                    } catch (error) {
                        return 'Please enter a valid JSON array (e.g., ["item1", "item2"])'
                    }
                    
                    // Check if it's actually an array
                    if (!Array.isArray(parsedArray)) {
                        return 'Value must be an array (e.g., ["item1", "item2"])'
                    }
                    
                    // Check if array is empty when required
                    if (promptItem.required && parsedArray.length === 0) {
                        return 'Array cannot be empty when required'
                    }
                    
                    // Validate each item according to the items type
                    if (promptItem.items) {
                        for (let i = 0; i < parsedArray.length; i++) {
                            const item = parsedArray[i]
                            const itemValidation = validateArrayItem(item, promptItem.items)
                            if (itemValidation !== true) {
                                return `Item ${i + 1}: ${itemValidation}`
                            }
                        }
                    }
                    
                    return true
                },
            })
        default: throw new Error(`Invalid prompt item type: ${promptItem.type}`)
    }

}

export default promptSelector