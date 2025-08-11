import { Args } from '@oclif/core'
import ora from 'ora'
import { TransactionCommand } from '../../TransactionCommand.js'
import uploadCandyMachineItems from '../../lib/cm/uploadItems.js'
import { validateCacheUploads, ValidateCacheUploadsOptions } from '../../lib/cm/validateCacheUploads.js'
import { createUploadProgressHandler } from '../../lib/ui/uploadProgressHandler.js'
import { 
    readAssetCache, 
    writeAssetCache, 
    validateCmDirectory, 
    createInitialAssetCache,
    getCmPaths 
} from '../../lib/cm/cm-utils.js'
import fs from 'node:fs'

export default class CmUpload extends TransactionCommand<typeof CmUpload> {
    static override description = `Uploads assets to online storage

    This command will:
    1. Create an initial asset cache from your assets folder (if none exists)
    2. Upload all assets to online storage
    3. Update the asset cache with URIs
    4. Validate the uploads
    `

    static override examples = [
        '$ mplx cm upload',
        '$ mplx cm upload <cm-directory>',
    ]

    static override usage = 'cm upload [FLAGS] [ARGS]'

    static override args = {
        directory: Args.string({
            description: 'Your candy machine directory with /assets/ directory inside',
            required: false
        }),
    }

    public async run() {
        const { args } = await this.parse(CmUpload)
        const { umi } = this.context

        try {
            validateCmDirectory(args.directory);
            
            // Try to read existing asset cache, or create initial one
            let assetCache;
            const { assetCachePath } = getCmPaths(args.directory);
            
            if (fs.existsSync(assetCachePath)) {
                this.log('📁 Found existing asset cache, using it...');
                assetCache = readAssetCache(args.directory);
            } else {
                this.log('📁 No asset cache found, creating initial cache from assets folder...');
                assetCache = await createInitialAssetCache(args.directory);
                writeAssetCache(assetCache, args.directory);
                this.log('📁 Initial asset cache created');
            }

            const uploadResult = await uploadCandyMachineItems(
                umi, 
                assetCache, 
                args.directory || process.cwd(), 
                createUploadProgressHandler()
            );

            writeAssetCache(uploadResult.assetCache, args.directory);
            this.log(`📄 Asset metadata updated successfully`);

            // Validate uploads
            const validationSpinner = ora('Validating uploads...').start();
            await validateCacheUploads(uploadResult.assetCache, ValidateCacheUploadsOptions.STORAGE);
            validationSpinner.succeed('Upload validation completed');
            
            this.logSuccess('Upload completed successfully');
        } catch (error) {
            this.error(`Upload failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
