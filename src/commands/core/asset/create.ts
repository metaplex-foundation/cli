import { Flags } from '@oclif/core'

import fs from 'node:fs'
import ora from 'ora'
import inquirer from 'inquirer'

import { generateSigner, Umi } from '@metaplex-foundation/umi'
import { base58 } from '@metaplex-foundation/umi/serializers'
import createAssetFromArgs from '../../../lib/core/create/createAssetFromArgs.js'
import createAssetsFromDirectory from '../../../lib/core/create/createAssetsFromDirectory.js'
import { Plugin, PluginData } from '../../../lib/types/pluginData.js'
import uploadFile, { UploadFileRessult } from '../../../lib/uploader/uploadFile.js'
import uploadJson from '../../../lib/uploader/uploadJson.js'
import pluginConfigurator from '../../../prompts/pluginInquirer.js'
import { PluginFilterType, pluginSelector } from '../../../prompts/pluginSelector.js'
import { TransactionCommand } from '../../../TransactionCommand.js'
import { ExplorerType, generateExplorerUrl } from '../../../explorers.js'


interface CreateAssetOptions {
  name?: string;
  uri?: string;
  image?: string;
  json?: string;
  plugins?: string;
  collection?: string;
  directory?: string;
  files?: boolean;
  wizard?: boolean;
}

interface WizardResponse {
  name?: string;
  description?: string;
  image?: string;
  collection?: string;
  usePlugins?: boolean;
}

interface AssetCreationResult {
  asset: string;
  signature: string;
  explorerUrl: string;
  coreExplorerUrl: string;
}

const WELCOME_MESSAGE = `--------------------------------
Welcome to the Asset Creator!

This command allows you to create Metaplex Core assets in three ways:
1. Using name and URI directly
2. Uploading image and JSON files
3. Creating multiple assets from a directory
--------------------------------`;

const SUCCESS_MESSAGE = (result: AssetCreationResult) => `--------------------------------
Asset created successfully!
Asset: ${result.asset}
Signature: ${result.signature}
Explorer: ${result.explorerUrl}
Core Explorer: ${result.coreExplorerUrl}
--------------------------------`;

export default class AssetCreate extends TransactionCommand<typeof AssetCreate> {
  static override description = `Create an MPL Core Asset using one of four methods:

  1. Direct Creation: Create a single asset by providing its name and metadata URI directly.
  2. File Upload: Create a single asset by uploading an image and JSON metadata file.
  3. Batch Creation (Coming Soon): Create multiple assets from a directory of sequentially named files.
  4. Interactive Wizard: Guided creation process with step-by-step prompts.`

  static override examples = [
    '# Create a single asset with direct metadata',
    '<%= config.bin %> <%= command.id %> --name "Cool Asset" --uri https://example.com/metadata.json',
    '# Create a single asset by uploading files',
    '<%= config.bin %> <%= command.id %> --files --image ./asset/image.png --json ./asset/metadata.json',
    '# Create an asset with plugins',
    '<%= config.bin %> <%= command.id %> --name "Cool Asset" --uri https://example.com/metadata.json --plugins ./plugins.json',
    '# Create an asset in a collection',
    '<%= config.bin %> <%= command.id %> --name "Cool Asset" --uri https://example.com/metadata.json --collection <collection-id>',
    '# Use the interactive wizard',
    '<%= config.bin %> <%= command.id %> --wizard',
    '# Batch creation from directory (Coming Soon)',
    '<%= config.bin %> <%= command.id %> --directory ./assets',
  ]

  static override usage = 'core asset create [FLAGS]'

  static override flags = {
    // Basic Creation Flags
    name: Flags.string({ 
      description: 'Asset name (required when not using --files or --directory)',
      exclusive: ['files', 'directory', 'wizard'],
    }),
    uri: Flags.string({ 
      description: 'URI of the Asset metadata (required when not using --files or --directory)',
      exclusive: ['files', 'directory', 'wizard'],
    }),
    collection: Flags.string({ 
      description: 'Collection public key (optional)',
    }),

    // File Upload Flags
    files: Flags.boolean({
      description: 'Create asset by uploading image and JSON files',
      exclusive: ['name', 'uri', 'directory', 'wizard'],
      dependsOn: ['image', 'json'],
    }),
    image: Flags.file({
      description: 'Path to image file (required with --files)',
      dependsOn: ['files'],
    }),
    json: Flags.file({
      description: 'Path to JSON metadata file (required with --files)',
      dependsOn: ['files'],
    }),

    // Batch Creation Flag (Coming Soon)
    directory: Flags.directory({ 
      description: 'Create multiple assets from a directory of sequentially named files (Coming Soon)',
      exclusive: ['files', 'name', 'uri', 'wizard'],
    }),

    // Plugin Flag
    plugins: Flags.file({ 
      description: 'Path to plugin configuration file in JSON format (optional)',
    }),

    // Wizard Flag
    wizard: Flags.boolean({
      description: 'Use interactive wizard to create an asset',
      exclusive: ['files', 'name', 'uri', 'directory'],
    }),
  }

  private async validateFlags(flags: CreateAssetOptions) {
    // Skip validation if using wizard mode
    if (flags.wizard) {
      return;
    }

    if (flags.directory) {
      if (!fs.existsSync(flags.directory)) {
        throw new Error(`Directory not found: ${flags.directory}`);
      }
      return;
    }

    if (flags.files) {
      if (!flags.image || !flags.json) {
        throw new Error('Both --image and --json flags are required when using --files');
      }
      if (!fs.existsSync(flags.image)) {
        throw new Error(`Image file not found: ${flags.image}`);
      }
      if (!fs.existsSync(flags.json)) {
        throw new Error(`JSON file not found: ${flags.json}`);
      }
      return;
    }

    if (!flags.name || !flags.uri) {
      throw new Error('Both --name and --uri flags are required when not using --files or --directory');
    }
  }

  private async uploadFiles(umi: Umi, imagePath: string, metadata: any): Promise<{ imageUri: UploadFileRessult; jsonUri: string }> {
    // Upload image
    const imageSpinner = ora('Uploading image...').start();
    const imageUri = await this.uploadAsset(umi, 'image', imagePath);
    imageSpinner.succeed(`Image uploaded to ${(imageUri as UploadFileRessult).uri}`);

    // Update metadata with image URI
    metadata.image = (imageUri as UploadFileRessult).uri;
    metadata.properties = metadata.properties || {};
    metadata.properties.files = [{
      uri: (imageUri as UploadFileRessult).uri,
      type: (imageUri as UploadFileRessult).mimeType,
    }];

    // Upload metadata
    const jsonSpinner = ora('Uploading metadata...').start();
    const jsonUri = await uploadJson(umi, metadata);
    jsonSpinner.succeed(`Metadata uploaded to ${jsonUri}`);

    return { imageUri: imageUri as UploadFileRessult, jsonUri };
  }

  private async createAssetFromFiles(umi: Umi, options: CreateAssetOptions): Promise<AssetCreationResult> {
    const jsonFile = JSON.parse(fs.readFileSync(options.json!, 'utf-8'));
    const { jsonUri } = await this.uploadFiles(umi, options.image!, jsonFile);

    const pluginData = options.plugins ? await this.loadPluginData(options.plugins) : undefined;

    const assetSpinner = ora('Creating Asset...').start();
    const result = await createAssetFromArgs(umi, {
      name: jsonFile.name,
      uri: jsonUri,
      collection: options.collection,
      plugins: pluginData,
    });

    assetSpinner.succeed('Asset created successfully');
    return this.formatResult(result, umi);
  }

  private async createAssetFromNameAndUri(umi: Umi, options: CreateAssetOptions): Promise<AssetCreationResult> {
    let pluginData: PluginData | undefined;

    if (options.plugins) {
      pluginData = await this.loadPluginData(options.plugins);
    } else {
      const selectedPlugins = await pluginSelector({filter: PluginFilterType.Asset});
      if (selectedPlugins) {
        pluginData = await pluginConfigurator(selectedPlugins as Plugin[]);
      }
    }

    const spinner = ora('Creating Asset...').start();
    const assetSigner = generateSigner(umi);

    const result = await createAssetFromArgs(umi, {
      assetSigner,
      name: options.name!,
      uri: options.uri!,
      collection: options.collection,
      plugins: pluginData,
    });

    spinner.succeed('Asset created successfully');
    return this.formatResult(result, umi);
  }

  private async uploadAsset(umi: Umi, type: 'image' | 'json', path: string) {
    try {
      if (type === 'image') {
        return await uploadFile(umi, path);
      } else {
        const jsonContent = JSON.parse(fs.readFileSync(path, 'utf-8'));
        return await uploadJson(umi, jsonContent);
      }
    } catch (error) {
      throw new Error(`Failed to upload ${type}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async loadPluginData(path: string): Promise<PluginData> {
    try {
      return JSON.parse(fs.readFileSync(path, 'utf-8')) as PluginData;
    } catch (error) {
      throw new Error(`Failed to load plugin data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private formatResult(result: any, umi: Umi): AssetCreationResult {
    return {
      asset: result.asset,
      signature: base58.deserialize(result.signature! as Uint8Array)[0],
      explorerUrl: generateExplorerUrl(this.context.explorer as ExplorerType, base58.deserialize(result.signature! as Uint8Array)[0], 'transaction'),
      coreExplorerUrl: `https://core.metaplex.com/explorer/${result.asset}`,
    };
  }

  private async runWizard(umi: Umi): Promise<AssetCreationResult> {
    const answers = await inquirer.prompt<WizardResponse>([
      {
        type: 'input',
        name: 'name',
        message: 'What is the name of your asset?',
        validate: (input: string) => {
          if (!input.trim()) return 'Asset name is required';
          return true;
        },
      },
      {
        type: 'input',
        name: 'description',
        message: 'Enter a description for your asset:',
      },
      {
        type: 'input',
        name: 'image',
        message: 'Enter the path to your asset image:',
        validate: (input: string) => {
          if (!input.trim()) return 'Image path is required';
          if (!fs.existsSync(input)) return 'Image file not found';
          return true;
        },
      },
      {
        type: 'input',
        name: 'collection',
        message: 'Enter collection public key (optional):',
      },
      {
        type: 'confirm',
        name: 'usePlugins',
        message: 'Would you like to configure plugins for this asset?',
        default: false,
      },
    ]);

    // Create metadata
    const metadata = {
      name: answers.name,
      description: answers.description,
    };

    // Upload files
    const { jsonUri } = await this.uploadFiles(umi, answers.image!, metadata);

    // Handle plugins if requested
    let pluginData: PluginData | undefined;
    if (answers.usePlugins) {
      const selectedPlugins = await pluginSelector({filter: PluginFilterType.Asset});
      if (selectedPlugins) {
        pluginData = await pluginConfigurator(selectedPlugins as Plugin[]);
      }
    }

    // Create asset
    const assetSpinner = ora('Creating asset...').start();
    const result = await createAssetFromArgs(umi, {
      name: answers.name!,
      uri: jsonUri,
      collection: answers.collection,
      plugins: pluginData,
    });

    assetSpinner.succeed('Asset created successfully');
    return this.formatResult(result, umi);
  }

  private getWelcomeMessage(flags: CreateAssetOptions): string {
    if (flags.wizard) {
      return `--------------------------------
Starting Asset Creation Wizard:
Guided process to create your asset.
--------------------------------`;
    } else if (flags.files) {
      return `--------------------------------
Creating Asset from Files:
Uploading image and JSON metadata files to create a new asset.
--------------------------------`;
    } else if (flags.directory) {
      return `--------------------------------
Creating Assets from Directory (Coming Soon):
This feature will allow creating multiple assets from a directory of files.
--------------------------------`;
    } else {
      return `--------------------------------
Creating Asset:
Creating a new asset with direct metadata URI.
--------------------------------`;
    }
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(AssetCreate);
    const { umi } = this.context;

    this.logSuccess(this.getWelcomeMessage(flags));
    await this.validateFlags(flags);

    if (flags.directory) {
      if (flags.directory === 'disabled') {
        this.log('Creating assets from directory coming soon');
        return;
      }
      await createAssetsFromDirectory(umi, flags.directory);
      return;
    }

    let result: AssetCreationResult;
    if (flags.wizard) {
      result = await this.runWizard(umi);
    } else if (flags.files) {
      result = await this.createAssetFromFiles(umi, flags);
    } else {
      result = await this.createAssetFromNameAndUri(umi, flags);
    }

    this.logSuccess(SUCCESS_MESSAGE(result));
  }
}
