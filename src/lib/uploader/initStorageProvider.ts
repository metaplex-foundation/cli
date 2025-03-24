import { Umi } from '@metaplex-foundation/umi'
import {ConfigJson} from '../Context.js'
import initIrysUploader from './uploadProviders/irys.js'

const initStorageProvider = (umi: Umi, config: ConfigJson) => {
  const storageConfig = config.storage

  if (!storageConfig) return

  switch (storageConfig.name) {
    case 'irys':
      return initIrysUploader(umi, storageConfig.options)
  }
}

export default initStorageProvider
