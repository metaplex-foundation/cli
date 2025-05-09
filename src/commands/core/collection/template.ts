import { Args } from '@oclif/core'
import fs from 'node:fs'
import path from 'node:path'
import ora from 'ora'
import { BaseCommand } from '../../../BaseCommand.js'
import { openDirectory } from '../../../lib/util.js'

export default class CoreCollectionTemplate extends BaseCommand<typeof CoreCollectionTemplate> {
  static override description = 'Generate a template folder for Collection metadata and image, and plugins'

  static override examples = [
    '<%= config.bin %> <%= command.id %> -n "Cool Collection" -u "https://example.com/collection-metadata.json"',
  ]

  static override args = {
    output: Args.string({ description: 'Destination for the template files' }),
  }

  public async run(): Promise<unknown> {
    const { flags, args } = await this.parse(CoreCollectionTemplate)
    const { output } = args

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
    const collectionPath = path.join(directory, 'collection')

    const spinner = ora('Checking for directory...').start()
    try {
      const dirExists = fs.existsSync(directory)

      if (!dirExists) {
        spinner.text = 'Creating directory...'
        fs.mkdirSync(directory, { recursive: true })
      }

      spinner.text = 'Writing Collection template files...'
      fs.mkdirSync(collectionPath, { recursive: true })
      fs.writeFileSync(path.join(collectionPath, 'metadata.json'), JSON.stringify(metadata, null, 2))

      spinner.text = 'Opening directory...'
      openDirectory(collectionPath)
      
      spinner.succeed(`Collection template folder created at: ${collectionPath}`)
    } catch (error) {
      spinner.fail(`Failed to create collection template: ${error instanceof Error ? error.message : 'Unknown error'}`)
      throw error
    }

    return
  }
}
