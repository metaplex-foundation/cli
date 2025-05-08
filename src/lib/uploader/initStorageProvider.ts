import {Umi} from '@metaplex-foundation/umi'
import {ConfigJson} from '../Context.js'
import initIrysUploader from './uploadProviders/irys.js'

const initStorageProvider = (config?: ConfigJson) => {
  const storageConfig = config?.storage

  switch (storageConfig?.name) {
    case 'irys':
    default:
      return initIrysUploader(storageConfig?.options)
  }
}

export default initStorageProvider
