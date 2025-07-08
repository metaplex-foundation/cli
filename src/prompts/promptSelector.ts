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
                    if (value.length > 0) return true
                    return 'Value is required'
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
        case 'array':
            return await input({
                message: promptItem.prompt,
                validate: (value) => {
                    if (promptItem.required && !value) return 'Value is required'
                    if (value.length > 0) return true
                    return 'Value is required'
                },
            })
        default: throw new Error(`Invalid prompt item type: ${promptItem.type}`)
    }

}

export default promptSelector