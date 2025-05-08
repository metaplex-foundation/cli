import { createCollection } from '@metaplex-foundation/mpl-core'
import { createGenericFile, generateSigner } from '@metaplex-foundation/umi'
import { Flags } from '@oclif/core'

import mime from 'mime'
import fs from 'node:fs'
import ora from 'ora'
import { Plugin } from '../../../lib/types/pluginData.js'
import { txSignatureToString } from '../../../lib/util.js'
import pluginConfigurator, { mapPluginDataToArray } from '../../../prompts/pluginInquirer.js'
import { PluginFilterType, pluginSelector } from '../../../prompts/pluginSelector.js'
import { TransactionCommand } from '../../../TransactionCommand.js'

export default class CoreCollectionCreate extends TransactionCommand<typeof CoreCollectionCreate> {
  static override description = 'Create an MPL Core Collection'

  static override examples = [
    '<%= config.bin %> <%= command.id %> --name My Collection --uri https://example.com/collection-metadata.json',
    '<%= config.bin %> <%= command.id %> --files --image /collection/image.png --json ./collection/metadata.json ',
  ]

  static override usage = 'core collection create [FLAGS]'

  static override flags = {
    // new flag group
    name: Flags.string({ name: 'name', char: 'n', description: 'Collections name' }),
    uri: Flags.string({ name: 'uri', char: 'u', description: 'URI of the Collection metadata' }),
    // new from files group
    files: Flags.boolean({
      name: 'files',
      char: 'f',
      summary: 'Signify that the files are being uploaded -i/--image and -j/--json are required',
      description:
        'The --files -f flag allows the user to create a Core Digital Collection buy providing both an image and metadata file.',
    }),
    image: Flags.string({
      name: 'image',
      char: 'i',
      description: 'path to image file to upload and assign to Collection',
      dependsOn: ['files'],
      exclusive: ['--name', '-n', '--uri', '-u'],
      hidden: true,
    }),
    json: Flags.string({
      name: 'json',
      char: 'j',
      description: 'path to JSON file to upload and assign to Collection',
      dependsOn: ['files'],
      exclusive: ['name', 'uri'],
      hidden: true,
    }),
  }

  // static override args = {
  //   file: Args.string({description: 'file to read'}),
  // }

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(CoreCollectionCreate)
    const { image, json, name, uri, files } = flags

    const { umi } = this.context

    let collectionName = name || undefined
    let metadataUri = uri || undefined

    //
    // Initial Validation
    //

    if (files && (name || uri)) {
      this.error('You cannot provide a name or uri when using the --files flag')
    }

    if (!files && !(name && uri)) {
      this.error('You must provide a --name/-u and --uri/-u or use the --files flag')
    }

    if (files && !(image && json)) {
      this.error('You must provide an image -i and JSON -j file')
    }

    //
    // Plugin Selection
    //

    const selectedPlugins = await pluginSelector({ filter: PluginFilterType.Collection })

    let pluginConfigurationData

    if (selectedPlugins) {
      pluginConfigurationData = await pluginConfigurator(selectedPlugins as Plugin[])
      console.log(pluginConfigurationData)
    }

    //
    // Files Flag
    //

    if (files) {
      // if files are being uploaded then we need to check if the image and json files are provided
      if (!image || !json) {
        this.error('You must provide an image -i and JSON -j file')
      }

      // Upload the image

      const imageSpinner = ora('Uploading Image...').start()

      const imageFile = fs.readFileSync(image)
      const mimeType = mime.getType(image)
      const genericFile = createGenericFile(imageFile, image, {
        tags: mimeType ? [{ name: 'mimeType', value: mimeType }] : [],
      })
      const uploadResult = await umi.uploader
        .upload([genericFile])
        .then((res) => {
          imageSpinner.succeed(`Image uploaded: ${res[0]}`)
          return res
        })
        .catch((error) => {
          imageSpinner.fail(`Error uploading image: ${error}`)
          return
        })

      if (!uploadResult) {
        throw new Error('Image upload failed')
      }

      const [imageUri] = uploadResult

      // Adjust the json file

      const jsonFile = JSON.parse(fs.readFileSync(json, 'utf-8'))

      collectionName = jsonFile.name

      if (!collectionName) {
        throw new Error('Collection name not found in JSON file')
      }

      jsonFile.image = imageUri
      jsonFile.properties.files[0] = {
        uri: imageUri,
        type: mimeType,
      }
      fs.writeFileSync(json, JSON.stringify(jsonFile, null, 2))

      // upload the json file

      const jsonSpinner = ora('Uploading Metadata...').start()

      metadataUri = await umi.uploader
        .uploadJson(jsonFile)
        .then((res) => {
          jsonSpinner.succeed(`Metadata uploaded: ${res}`)
          return res
        })
        .catch((error) => {
          jsonSpinner.fail(`Error uploading metadata: ${error}`)
          return undefined
        })
    }

    if (!metadataUri) {
      throw new Error('Metadata upload failed')
    }

    //
    // Create the Core Collection onchain.
    //

    const spinner = ora('Creating Collection...').start()

    if (!collectionName) {
      throw new Error('Collection name not found')
    }

    const collection = generateSigner(umi)

    // const pluginsMap = pluginConfigurationData && mapPluginDataToArray(pluginConfigurationData)

    createCollection(umi, {
      collection,
      name: collectionName,
      uri: metadataUri,
      plugins: pluginConfigurationData ? mapPluginDataToArray(pluginConfigurationData) : undefined,
    })
      .sendAndConfirm(umi)
      .then((tx) => {
        const txStr = txSignatureToString(tx.signature)
        spinner.succeed(`Collection: ${collection.publicKey} signature: ${txStr}`)
      })
      .catch((error) => {
        spinner.fail(`Error creating Collection: ${error}`)
        return
      })

    return
  }
}
