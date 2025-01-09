import {Flags} from '@oclif/core'
import fs from 'node:fs'

import {BaseCommand} from '../../../BaseCommand.js'
import {openDirectory} from '../../../lib/util.js'
import ora from 'ora'

export default class CollectionTemplate extends BaseCommand<typeof CollectionTemplate> {
  static override description = 'Generate a template folder for Asset metadata and image'

  static override examples = [
    '<%= config.bin %> <%= command.id %> -n "Cool Asset" -u "https://example.com/metadata.json"',
  ]

  static override flags = {
    output: Flags.string({char: 'o', description: 'Destination for the template files'}),
  }

  public async run(): Promise<unknown> {
    const {flags} = await this.parse(CollectionTemplate)
    const {output} = flags

    // eslint-disable-next-line no-warning-comments
    // TODO create different assets types

    const metadata = {
      name: 'My Collection',
      image: 'https://example.com/collection-image.png',
      animation: '',
      website: '',
      properties: {
        files: [],
        category: 'image',
      },
    }

    const directory = output || process.cwd()

    //create directory if it doesn't exist
    const spinner = ora('Checking for directory...').start()
    const dirExists = fs.existsSync(directory)

    if (!dirExists) {
      spinner.text = 'Creating directory...'
      fs.mkdirSync(directory, {recursive: true})
    }

    spinner.text = 'Writing Collection template files...'
    fs.mkdirSync(directory + '/collection', {recursive: true})
    fs.writeFileSync(directory + '/collection/metadata.json', JSON.stringify(metadata, null, 2))

    spinner.text = 'Opening directory...'
    openDirectory(directory + '/collection')
    spinner.succeed(`Collection template folder created at: ${directory + '/collection'}`)
    // encode the path to handle spaces in the path

    // this.log('collection template folder created at:', directory + '/asset')

    return
  }
}
