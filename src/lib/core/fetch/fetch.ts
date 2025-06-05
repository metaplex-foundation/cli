import { fetchAsset } from '@metaplex-foundation/mpl-core'
import { publicKey, Umi } from '@metaplex-foundation/umi'
import { fileTypeFromBuffer } from 'file-type'
import mime from 'mime-types'
import fs from 'node:fs'
import { join } from 'node:path'
import util from 'node:util'
import ora from 'ora'
import { ensureDirectoryExists } from '../../file.js'
import { jsonStringify } from '../../util.js'

interface FetchCoreAssetDownloadOptions {
  outputPath?: string
  download?: boolean
  image?: boolean
  metadata?: boolean
  asset?: boolean
}

interface DownloadedImage {
  fileName: string
  ext: string
  data: ArrayBuffer
}

const fetchJson = async (url: string): Promise<any> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch JSON from ${url}: ${response.statusText}`);
  }
  return response.json();
};

const fetchImage = async (url: string): Promise<DownloadedImage> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image from ${url}: ${response.statusText}`);
  }

  const data = await response.arrayBuffer();
  const buffer = Buffer.from(data);

  // Try to detect file type from bytes first
  const fileType = await fileTypeFromBuffer(buffer);
  let ext = fileType?.ext;

  // If no extension from bytes, try content-type
  if (!ext) {
    const contentType = response.headers.get('content-type');
    const mimeExt = contentType ? mime.extension(contentType) : undefined;
    ext = typeof mimeExt === 'string' ? mimeExt : undefined;
  }

  // If still no extension, try URL
  if (!ext) {
    const urlExt = mime.extension(mime.lookup(url) || '');
    ext = typeof urlExt === 'string' ? urlExt : undefined;
  }

  // If still no extension, use a safe default
  if (!ext) {
    // Check if URL ends with a common image extension
    const urlLower = url.toLowerCase();
    const commonExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const foundExt = commonExts.find(ext => urlLower.endsWith(ext));
    if (foundExt) {
      ext = foundExt.slice(1); // Remove the leading dot
    } else {
      // Default to .bin for unknown types
      ext = 'bin';
    }
  }

  return {
    fileName: `image.${ext}`,
    ext,
    data,
  };
};

const fetchCoreAsset = async (umi: Umi, asset: string, options: FetchCoreAssetDownloadOptions) => {
  try {
    // Fetch the Asset
    const fetchedAsset = await fetchAsset(umi, publicKey(asset));
    
    // If not in download mode, just display the asset info
    if (!options.download) {
      console.log(util.inspect(fetchedAsset, false, null, true));
      return;
    }

    const fetchSpinner = ora('Downloading Asset data...').start();
    
    try {
      // Use current directory if no output path specified
      const baseDirectory = options.outputPath || process.cwd();
      
      // Ensure the output directory exists
      ensureDirectoryExists(baseDirectory);

      // Determine what to download based on options
      const shouldDownloadImage = options.image;
      const shouldDownloadMetadata = options.metadata;
      const shouldDownloadAsset = options.asset;

      // If no specific download options are selected, download everything
      const downloadAll = !shouldDownloadImage && !shouldDownloadMetadata && !shouldDownloadAsset;

      // Save asset data if requested or if downloading all
      if (shouldDownloadAsset || downloadAll) {
        fs.writeFileSync(
          join(baseDirectory, `${asset}-asset.json`),
          jsonStringify(fetchedAsset, 2)
        );
      }

      // Always fetch metadata if we need the image or metadata
      if (shouldDownloadImage || shouldDownloadMetadata || downloadAll) {
        const jsonFile = await fetchJson(fetchedAsset.uri);
        
        // Save metadata if requested or if downloading all
        if (shouldDownloadMetadata || downloadAll) {
          fs.writeFileSync(
            join(baseDirectory, `${asset}-metadata.json`),
            jsonStringify(jsonFile, 2)
          );
        }

        // Download image if requested or if downloading all
        if ((shouldDownloadImage || downloadAll) && jsonFile.image) {
          const image = await fetchImage(jsonFile.image);
          fs.writeFileSync(
            join(baseDirectory, `${asset}-image.${image.ext}`),
            new Uint8Array(image.data)
          );
        } else if ((shouldDownloadImage || downloadAll) && !jsonFile.image) {
          throw new Error('Image URL not found in metadata');
        }
      }

      fetchSpinner.succeed('Asset downloaded successfully');

      // Display results
      console.log(`--------------------------------`);
      console.log(`Asset: ${asset}`);
      console.log(`Files saved to: ${baseDirectory}`);
      console.log(`--------------------------------`);

      return baseDirectory;
    } catch (error) {
      fetchSpinner.fail('Failed to download asset');
      throw error;
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch asset: ${error.message}`);
    }
    throw new Error('Failed to fetch asset: Unknown error occurred');
  }
};

export default fetchCoreAsset;
