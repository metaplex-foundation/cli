import { Args, Flags } from '@oclif/core'

import fs from 'node:fs'
import path from 'node:path'
import ora from 'ora'
import { TransactionCommand } from '../../../TransactionCommand.js'
import uploadFile from '../../../lib/uploader/uploadFile.js'
import uploadFiles from '../../../lib/uploader/uploadFiles.js'


interface UploadCache {
    files: {
        fileName: string
        uri: string
        mimeType: string
    }[]
}

export default class ToolboxStorageUpload extends TransactionCommand<typeof ToolboxStorageUpload> {
    static override description = 'Upload files to the storage'

    static override examples = [
        '<%= config.bin %> <%= command.id %> toolbox storage upload ./assets/1.json',
        '<%= config.bin %> <%= command.id %> toolbox storage upload ./assets --directory',
    ]

    static override usage = 'toolbox storage upload [FLAGS]'

    static override args = {
        path: Args.string({ description: 'File to upload', required: true }),
    }

    static override flags = {
        directory: Flags.boolean({ description: 'Is directory', required: false }),
    }


    public async run() {
        const { args, flags } = await this.parse(ToolboxStorageUpload)

        const { umi } = this.context

        if (flags.directory) {
            this.log('Uploading directory...\n')
            const files = fs.readdirSync(args.path)

            const filePaths = files.map(file => path.join(args.path, file))

            const progressSpinner = ora('Checking storage balance and funding if needed...').start()
            const onProgress = (progress: number) => {
                progressSpinner.text = `Uploading files... ${Math.round(progress)}%`
            }
            const uploadResult = await uploadFiles(umi, filePaths, onProgress)
            progressSpinner.succeed('Upload completed')


            const uploadCache: UploadCache = {
                files: uploadResult.map(result => ({
                    fileName: result.fileName,
                    uri: result.uri || '',
                    mimeType: result.mimeType,
                })),
            }

            const cacheSpinner = ora('Saving cache...').start()
            fs.writeFileSync('uploadCache.json', JSON.stringify(uploadCache, null, 2))
            cacheSpinner.succeed('Cache saved')
            this.logSuccess(
                `--------------------------------
    Successfully uploaded ${files.length} files
    
    Upload cache saved to uploadCache.json
---------------------------------`
            )
        } else {
            const spinner = ora('Checking storage balance and funding if needed...').start()
            const uploadResult = await uploadFile(umi, args.path)
            spinner.succeed('File uploaded successfully')

            this.logSuccess(
                `--------------------------------
    Uploaded ${args.path}
    URI: ${uploadResult.uri}
---------------------------------`
            )
        }
    }
}
