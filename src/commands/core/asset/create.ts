import { Flags } from '@oclif/core'

import fs from 'node:fs'
import ora from 'ora'

import { generateSigner } from '@metaplex-foundation/umi'
import createAssetFromArgs from '../../../lib/core/create/createAssetFromArgs.js'
import createAssetFromFiles from '../../../lib/core/create/createAssetFromFiles.js'
import createAssetsFromDirectory from '../../../lib/core/create/createAssetsFromDirectory.js'
import { PluginData } from '../../../lib/types/pluginData.js'
import pluginConfigurator from '../../../prompts/pluginInquirer.js'
import { PluginFilterType, pluginSelector } from '../../../prompts/pluginSelector.js'
import { TransactionCommand } from '../../../TransactionCommand.js'

/* 
  Create Possibilities:

  1. Create a single Asset by providing the name and URI of the metadata.

  2. Create a single Asset by providing an image file to upload and a JSON file to upload and assign to the Asset.

  3. Create multiple Assets by providing a folder path with JSON files named sequentially ie (1.json, 2.json, 3.json) containing the offchain metadata.

  4. Create multiple Assets by providing a folder path both JSON files and image files named sequentially ie (1.json, 1.png, 2.json, 2.png, 3.json, 3.png) to upload and assign to the Assets.

  TODO - For single Asset creation, allow for the user to mint multiple copies of the same Asset via a flag(s).

*/

export default class AssetCreate extends TransactionCommand<typeof AssetCreate> {
  static override description = 'Create an MPL Core Asset'

  static override examples = [
    '<%= config.bin %> <%= command.id %> --name Cool Asset --uri https://example.com/metadata.json',
    '<%= config.bin %> <%= command.id %> --files --image /asset/image.png --json ./asset/metadata.json ',
    '<%= config.bin %> <%= command.id %> --files --image /asset/image.png --json ./asset/metadata.json ',
  ]

  static override usage = 'core asset create [FLAGS]'

  static override flags = {
    // new flag group
    name: Flags.string({name: 'name', description: 'Asset name'}),
    uri: Flags.string({name: 'uri', description: 'URI of the Asset metadata'}),
    collection: Flags.string({name: 'collection', description: 'Collection ID'}),
    // new from files group
    files: Flags.boolean({
      name: 'files',
      summary: 'Signify that the files are being uploaded -i/--image and -j/--json are required',
      description:
        'The --files flag allows the user to create a Core Digital asset buy providing both an image and metadata file.',
    }),
    image: Flags.directory({
      name: 'image',
      description: 'path to image file to upload and assign to Asset',
      dependsOn: ['files'],
      exclusive: ['--name', '-n', '--uri', '-u'],
      hidden: true,
    }),
    json: Flags.directory({
      name: 'json',
      description: 'path to JSON file to upload and assign to Asset',
      dependsOn: ['files'],
      exclusive: ['name', 'uri'],
      hidden: true,
    }),
    plugins: Flags.directory({name: 'plugins', description: 'Path to a json file with plugin data'}),
    directory: Flags.directory({name: 'directory', description: 'Directory of which to create Assets from'}),
  }

  public async run(): Promise<unknown> {
    const {args, flags} = await this.parse(AssetCreate)

    const {umi} = this.context

    if (flags.directory) {
      await createAssetsFromDirectory(umi, flags.directory)
      return
    } else if (flags.files) {
      if (!flags.image || !flags.json) {
        this.error('You must provide an image --image and JSON --json file')
      }

      await createAssetFromFiles(umi, {
        jsonPath: flags.json,
        imagePath: flags.image,
        collection: flags.collection,
        pluginsPath: flags.plugins,
        // TODO: Add owner field.
      })
    } else {
      // create asset from name and uri flags and the plugin prompter

      if (!flags.name) {
        throw new Error('Asset name not found')
      }

      if (!flags.uri) {
        throw new Error('Asset metadata URI not found')
      }

      let pluginData

      if (flags.plugins) {
        pluginData = JSON.parse(fs.readFileSync(flags.plugins, 'utf-8')) as PluginData
      } else {
        const selectedPlugins = await pluginSelector(PluginFilterType.Asset)

        if (selectedPlugins) {
          pluginData = await pluginConfigurator(selectedPlugins)
        }
      }

      const spinner = ora('Creating Asset...').start()

      const assetSigner = generateSigner(umi)

      const res = await createAssetFromArgs(umi, {
        assetSigner,
        name: flags.name,
        uri: flags.uri,
        collection: flags.collection,
        plugins: pluginData,
      })
        .then((res) => {
          spinner.succeed(`Asset created with ID: ${assetSigner.publicKey}`)
        })
        .catch((err) => {
          spinner.fail(`Failed to create Asset. ${err}`)
        })
    }
  }
}
