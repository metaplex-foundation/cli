import { Args, Flags } from '@oclif/core'
import fs from 'node:fs'

import { BaseCommand } from '../../../BaseCommand.js'
import { openDirectory } from '../../../lib/util.js'
import ora from 'ora'
import assetTemplate from '../../../lib/core/templates/offchainAssetTemplate.js'
import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

/* 
  Tempalte Possibilities:

  1. Generate a template folder and write Asset metadata tempalte, Asset plugins tempalte, and image placeholder to disk.

*/

export default class AssetTemplate extends BaseCommand<typeof AssetTemplate> {
  static override description = 'Generate a template folder for Asset metadata and image'

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> -o',
    '<%= config.bin %> <%= command.id %> -o /path/to/directory',
  ]


  static override args = {
    output: Args.string({ name: 'output', description: 'Output directory, if not provided, the current working directory will be used' }),
  }

  public async run(): Promise<unknown> {
    const { flags, args } = await this.parse(AssetTemplate)
    const { output } = args

    // eslint-disable-next-line no-warning-comments
    // TODO create different assets types

    const directory = output || process.cwd()

    //create directory if it doesn't exist
    const spinner = ora('Checking for directory...').start()
    const dirExists = fs.existsSync(directory)

    if (!dirExists) {
      spinner.text = 'Creating directory...'
      fs.mkdirSync(directory, { recursive: true })
    }

    spinner.text = 'Writing Asset template files...'
    fs.mkdirSync(directory + '/asset', { recursive: true })
    fs.writeFileSync(directory + '/asset/metadata.json', JSON.stringify(assetTemplate, null, 2))

    // TODO: Fix copying placeholder image

    // const __filename = fileURLToPath(import.meta.url)
    // const __dirname = dirname(__filename)
    // const sourceImagePath = path.join(__dirname, '../../../assets/images/metaplex.jpg')
    // console.log(sourceImagePath)
    // fs.copyFileSync(sourceImagePath, directory + '/asset/image.jpg')

    spinner.text = 'Opening directory...'
    openDirectory(directory + '/asset')
    spinner.succeed(` Asset template folder created at: ${directory + '/asset'}`)
    // encode the path to handle spaces in the path

    // this.log('Asset template folder created at:', directory + '/asset')

    return
  }
}
