import { Args } from '@oclif/core'
import { TransactionCommand } from '../../TransactionCommand.js'
import insertItems from '../../lib/cm/insertItems.js'
import { readCmConfig, readAssetCache, writeAssetCache, getCmPaths } from '../../lib/cm/cm-utils.js'
import fs from 'node:fs'

export default class CmCreate extends TransactionCommand<typeof CmCreate> {
    static override description = `Inserts items into a candy machine

    This command requires:
    1. A valid cm-config.json file with candyMachineId
    2. A valid asset-cache.json file with uploaded URIs
    
    If you don't have an asset cache, run 'mplx cm upload' first.
    `

    static override examples = [
        '$ mplx cm insert',
        '$ mplx cm insert <directory>',
    ]

    static override usage = 'cm insert [ARGS]'

    static override args = {
        directory: Args.string({
            description: 'The directory containing the asset cache file',
            required: false
        })
    }

    public async run() {
        const { args } = await this.parse(CmCreate)
        const { umi } = this.context

        try {
            const config = readCmConfig(args.directory);
            
            // Check if candy machine exists
            if (!config.candyMachineId) {
                this.error('No candy machine ID found in config. Please run "mplx cm create" first to create a candy machine.');
            }
            
            const { assetCachePath } = getCmPaths(args.directory);
            if (!fs.existsSync(assetCachePath)) {
                this.error(`Asset cache file not found at ${assetCachePath}. Please run "mplx cm upload" first to upload your assets.`);
            }
            
            const assetCache = readAssetCache(args.directory);

            const res = await insertItems(umi, config, assetCache);

            writeAssetCache(res.assetCache, args.directory);

            this.logSuccess(`Asset cache updated successfully`);
        } catch (error) {
            this.error(`Insert failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
