import {irysUploader, IrysUploaderOptions} from '@metaplex-foundation/umi-uploader-irys'

const initIrysUploader = (options: IrysUploaderOptions) => {
  return irysUploader(options)
}

export default initIrysUploader
