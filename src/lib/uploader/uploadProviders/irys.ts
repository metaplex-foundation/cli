import { irysUploader, IrysUploaderOptions } from '@metaplex-foundation/umi-uploader-irys'

const initIrysUploader = async (options?: IrysUploaderOptions) => {

  return irysUploader(options)
}

export default initIrysUploader
