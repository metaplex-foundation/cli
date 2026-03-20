import { UmiPlugin } from '@metaplex-foundation/umi'
// import cascade from './cascade.js'
import irys from './irys.js'
// import turbo from './turbo.js'

export interface StorageProvider<T = any> {
    name: 'irys' | 'cascade'
    description?: string
    website?: string
    params?: {
        name: string
        description: string
        type: string
        required: boolean
    }[],
    umiPlugin: (options?: T) => Promise<UmiPlugin>
}

export const storageProviders = {
    irys,
    // cascade,
    // turbo
}
