
import { IrysUploaderOptions } from '@metaplex-foundation/umi-uploader-irys'
import { ConfigJson } from '../Context.js'
import { storageProviders } from './uploadProviders/index.js'
//import { CascadeUploaderOptions } from '@metaplex-foundation/umi-uploader-cascade'


const initStorageProvider = (config?: ConfigJson) => {
  const storageConfig = config?.storage

  switch (storageConfig?.name) {
    // case 'arTurbo':
    //   return storageProviders.arTurbo.umiPlugin(storageConfig?.options as ArweaveUploaderOptions)
    case 'irys':
      return storageProviders.irys.umiPlugin(storageConfig?.options as IrysUploaderOptions)
    case 'cascade':
    //return storageProviders.cascade.umiPlugin(storageConfig?.options as CascadeUploaderOptions)
    default:
      throw new Error(`Storage provider ${storageConfig?.name} not supported`)
  }
}

export default initStorageProvider
