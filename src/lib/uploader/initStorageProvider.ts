import { Umi } from '@metaplex-foundation/umi'
import {ConfigJson} from '../Context.js'
import initIrysUploader from './uploadProviders/irys.js'

const initStorageProvider = (umi: Umi, config?: ConfigJson) => {
  const storageConfig = config?.storage

  console.log('storageConfig', storageConfig)
  switch (storageConfig?.name) {
    case 'irys':
      return initIrysUploader(storageConfig?.options)
    default:
      return initIrysUploader(storageConfig?.options)
  }
}

export default initStorageProvider
