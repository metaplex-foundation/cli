import { Args } from '@oclif/core'
import fs from 'node:fs'
import path from 'node:path'
import ora from 'ora'
import { BaseCommand } from '../../BaseCommand.js'
import { validateCacheUploads, ValidateCacheUploadsOptions } from '../../lib/cm/validateCacheUploads.js'

export default class CmValidate extends BaseCommand<typeof CmValidate> {
    static override description = `Validate the asset cache file`

    static override examples = [
        '$ mplx cm validate',
        '$ mplx cm validate <path_to_asset_cache_file>',
    ]

    static override usage = 'cm validate [ARGS]'

    static override args = {
        path: Args.string({
            description: 'Path to the asset cache file',
            required: false
        })
    }

    public async run() {
        const { args } = await this.parse(CmValidate)

        try {
            let assetCachePath: string;

            if (args.path) {
                assetCachePath = path.isAbsolute(args.path) ? args.path : path.join(process.cwd(), args.path);
            } else {
                assetCachePath = path.join(process.cwd(), 'asset-cache.json');
            }

            const assetCache = JSON.parse(fs.readFileSync(assetCachePath, 'utf8'));

            const validateSpinner = ora('Validating cache').start();

            await validateCacheUploads(assetCache, ValidateCacheUploadsOptions.STORAGE)
                .then(() => {
                    validateSpinner.succeed('Cache validated');
                })
                .catch((error: Error) => {
                    validateSpinner.fail(error.message);
                });
        } catch (error) {
            this.error(`Validation failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}