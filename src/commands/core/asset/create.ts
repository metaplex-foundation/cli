import { Flags } from '@oclif/core'

import fs from 'node:fs'
import ora from 'ora'

import { generateSigner } from '@metaplex-foundation/umi'
import { base58 } from '@metaplex-foundation/umi/serializers'
import createAssetFromArgs from '../../../lib/core/create/createAssetFromArgs.js'
import createAssetsFromDirectory from '../../../lib/core/create/createAssetsFromDirectory.js'
import { Plugin, PluginData } from '../../../lib/types/pluginData.js'
import uploadFile from '../../../lib/uploader/uploadFile.js'
import uploadJson from '../../../lib/uploader/uploadJson.js'
import pluginConfigurator from '../../../prompts/pluginInquirer.js'
import { PluginFilterType, pluginSelector } from '../../../prompts/pluginSelector.js'
import { TransactionCommand } from '../../../TransactionCommand.js'
import { ExplorerType, generateExplorerUrl } from '../../../explorers.js'

/* 
  Create Possibilities:

  1. Create a single Asset by providing the name and URI of the metadata.

  2. Create a single Asset by providing an image file to upload and a JSON file to upload and assign to the Asset.

  3. Create multiple Assets by providing a folder path with JSON files named sequentially ie (1.json, 2.json, 3.json) containing the offchain metadata.

  4. Create multiple Assets by providing a folder path both JSON files and image files named sequentially ie (1.json, 1.png, 2.json, 2.png, 3.json, 3.png) to upload and assign to the Assets.

  TODO - For single Asset creation, allow for the user to mint multiple copies of the same Asset via a flag(s).

*/

/* 
  Fixes:

  TODO - For some reason when including --image and --json flags without --files flag, I get a huge json message rather than a pretty error message.

*/



export default class AssetCreate extends TransactionCommand<typeof AssetCreate> {
  static override description = `Create an MPL Core Asset using 3 different methods.\n
    1. Create a single Asset by providing the name and URI of the metadata with the --name and --uri flags.
    2. Create a single Asset by providing a --files flag followed by a --image flag and a --json flag and the path to the image and JSON file.
    3. Create multiple Assets by providing a --directory flag and a path to a directory with image and JSON files named sequentially ie (0.png, 0.json, 1.png, 1.json, 2.png, 2.json) containing the offchain metadata.\n
    When using the --directory flag the cli will look for a global-plugins.json file within the directory and apply the plugins to the Assets. You can also provide individual plugin json files to be applied to each Asset by adding plugin-<index>.json files to the directory.
    `

  static override examples = [
    '<%= config.bin %> <%= command.id %> --name Cool Asset --uri https://example.com/metadata.json',
    '<%= config.bin %> <%= command.id %> --files --image ./asset/image.png --json ./asset/metadata.json',
    '<%= config.bin %> <%= command.id %> --directory ./assets',
  ]

  static override usage = 'core asset create [FLAGS]'

  static override flags = {
    // new flag group
    name: Flags.string({ name: 'name', description: 'Asset name' }),
    uri: Flags.string({ name: 'uri', description: 'URI of the Asset metadata' }),
    collection: Flags.string({ name: 'collection', description: 'Collection ID' }),
    // new from files group
    files: Flags.boolean({
      name: 'files',
      summary: 'Signify that the files are being uploaded -i/--image and -j/--json are required',
      description:
        'The --files flag allows the user to create a Core Digital asset buy providing both an image and metadata file.',
      dependsOn: ['image', 'json'],
    }),
    image: Flags.directory({
      name: 'image',
      description: 'path to image file to upload and assign to Asset',
      dependsOn: ['files'],
      exclusive: ['--name', '--uri'],
      hidden: true,
    }),
    json: Flags.directory({
      name: 'json',
      description: 'path to JSON file to upload and assign to Asset',
      dependsOn: ['files'],
      exclusive: ['name', 'uri'],
      hidden: true,
    }),
    plugins: Flags.directory({ name: 'plugins', description: 'Path to a json file with plugin data' }),
    directory: Flags.directory({ name: 'directory', description: 'Directory of which to create Assets from', exclusive: ['files', 'name', 'uri'] }),
  }

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(AssetCreate)

    const { umi, explorer } = this.context

    if (flags.directory) {
      const res = await createAssetsFromDirectory(umi, flags.directory)
      return {
        assets: res,
      }
    } else if (flags.files) {
      if (!flags.image || !flags.json) {
        this.error('You must provide an image --image and JSON --json file')
      }

      // upload image and json
      const imageSpinner = ora('Uploading image...').start()

      const imageUri = await uploadFile(umi, flags.image).catch((err) => {
        imageSpinner.fail(`Failed to upload image. ${err}`)
        throw err
      })

      imageSpinner.succeed(`Image uploaded to ${imageUri.uri}`)


      // adjust json and upload

      const jsonFile = JSON.parse(fs.readFileSync(flags.json, 'utf-8'))

      jsonFile.image = imageUri.uri

      jsonFile.properties.files[0] = {
        uri: imageUri.uri,
        type: imageUri.mimeType,
      }

      fs.writeFileSync(flags.json, JSON.stringify(jsonFile, null, 2))

      const jsonSpinner = ora('Uploading JSON...').start()

      const jsonUri = await uploadJson(umi, flags.json).catch((err) => {
        imageSpinner.fail(`Failed to upload json. ${err}`)
        throw err
      })

      jsonSpinner.succeed(`JSON uploaded to ${jsonUri}`)

      const pluginData = flags.plugins ? JSON.parse(fs.readFileSync(flags.plugins, 'utf-8')) as PluginData : undefined

      const assetSpinner = ora('Creating Asset...').start()

      const result = await createAssetFromArgs(umi, {
        name: jsonFile.name,
        uri: jsonUri,
        collection: flags.collection,
        plugins: pluginData,
        // TODO: Add owner field.
      }).catch((err) => {
        console.error('Failed to create asset:', err)
        throw err
      })

      assetSpinner.succeed(`Asset created successfully`)

      console.log({result})

      this.logSuccess(`--------------------------------
  Asset: ${result.asset}
  Signature: ${base58.deserialize(result.signature! as Uint8Array)[0]}
  Explorer: ${generateExplorerUrl(explorer as ExplorerType, base58.deserialize(result.signature! as Uint8Array)[0], 'transaction')}
  Core Explorer: https://core.metaplex.com/explorer/${result.asset}\n
--------------------------------`)

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
        const selectedPlugins = await pluginSelector({filter: PluginFilterType.Asset})

        if (selectedPlugins) {
          pluginData = await pluginConfigurator(selectedPlugins as Plugin[])
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
          spinner.succeed("Asset created successfully")

          return res
        })
        .catch((err) => {
          spinner.fail(`Failed to create Asset. ${err}`)
          throw err
        })

      this.logSuccess(
        `--------------------------------\n
  Asset: ${res.asset}\n
  Signature: ${base58.deserialize(res.signature! as Uint8Array)[0]}\n
  Explorer: ${generateExplorerUrl(explorer as ExplorerType, base58.deserialize(res.signature! as Uint8Array)[0], 'transaction')}\n
  Core Explorer: https://core.metaplex.com/explorer/${res.asset}\n
--------------------------------`
      )
    }
  }
}
