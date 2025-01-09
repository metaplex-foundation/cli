import {ConfigJson} from '../Context.js'
import initIrysUploader from './uploadProviders/irys.js'

const initStorageProvider = (config: ConfigJson) => {
  const storageConfig = config.storage

  if (!storageConfig) return

  switch (storageConfig.name) {
    case 'irys':
      return initIrysUploader(storageConfig.options)
  }
}

export default initStorageProvider
