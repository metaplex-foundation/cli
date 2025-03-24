import { Umi } from '@metaplex-foundation/umi'
import { irysUploader, IrysUploaderOptions } from '@metaplex-foundation/umi-uploader-irys'

const initIrysUploader = async (umi: Umi, options: IrysUploaderOptions) => {

  return irysUploader(options)
}

export default initIrysUploader
