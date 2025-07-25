import { Args, Flags } from '@oclif/core'
import fs from 'node:fs'
import path from 'node:path'
import ora from 'ora'
import { BaseCommand } from '../../BaseCommand.js'
import { validateCacheUploads, ValidateCacheUploadsOptions } from '../../lib/cm/validateCacheUploads.js'

export default class CmValidate extends BaseCommand<typeof CmValidate> {
    static override description = `Validate asset cache against storage uploads or onchain insertions`

    static override examples = [
        '$ mplx cm validate',
        '$ mplx cm validate --onchain',
        '$ mplx cm validate <path_to_asset_cache_file>',
        '$ mplx cm validate <path_to_asset_cache_file> --onchain',
    ]

    static override usage = 'cm validate [ARGS] [FLAGS]'

    static override flags = {
        onchain: Flags.boolean({
            description: 'Validate that items have been inserted onchain (default validates storage uploads)',
            default: false
        })
    }

    static override args = {
        path: Args.string({
            description: 'Path to the asset cache file (defaults to ./asset-cache.json)',
            required: false
        })
    }

    public async run() {
        const { args, flags } = await this.parse(CmValidate)

        try {
            let assetCachePath: string;

            if (args.path) {
                assetCachePath = path.isAbsolute(args.path) ? args.path : path.join(process.cwd(), args.path);
            } else {
                assetCachePath = path.join(process.cwd(), 'asset-cache.json');
            }

            const assetCache = JSON.parse(fs.readFileSync(assetCachePath, 'utf8'));

            const validationType = flags.onchain ? 'onchain insertions' : 'storage uploads';
            const validateSpinner = ora(`Validating ${validationType}`).start();

            const validationOption = flags.onchain ? ValidateCacheUploadsOptions.ONCHAIN : ValidateCacheUploadsOptions.STORAGE;
            await validateCacheUploads(assetCache, validationOption)
                .then(() => {
                    validateSpinner.succeed(`${validationType.charAt(0).toUpperCase() + validationType.slice(1)} validated successfully`);
                })
                .catch((error: Error) => {
                    validateSpinner.fail(error.message);
                });
        } catch (error) {
            this.error(`Validation failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}