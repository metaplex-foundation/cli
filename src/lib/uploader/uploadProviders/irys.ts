import { irysUploader, IrysUploaderOptions } from '@metaplex-foundation/umi-uploader-irys'
import { StorageProvider } from './index.js'

const initIrysUploader = async (options?: IrysUploaderOptions) => {
  return irysUploader(options)
}

export const irys: StorageProvider<IrysUploaderOptions> = {
  name: 'irys',
  description: 'Irys is a storage provider that uses the Irys network to store data.',
  website: 'https://irys.xyz/',
  umiPlugin: initIrysUploader
}

export default irys
