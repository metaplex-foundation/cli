import {
  CreateCollectionArgsPlugin,
  Creator
} from '@metaplex-foundation/mpl-core'
import { isPublicKey, publicKey } from '@metaplex-foundation/umi'
import { select, input, confirm } from '@inquirer/prompts'
import { Plugin, PluginData } from '../lib/types/pluginData.js'
import { terminalColors } from '../lib/StandardColors.js'

export const mapPluginDataToArray = (data: PluginData): CreateCollectionArgsPlugin[] => {
  return Object.values(data)
}


const pluginConfigurator = async (plugins: Array<Plugin>): Promise<PluginData> => {
  const pluginData: PluginData = {}

  for (const plugin of plugins) {
    switch (plugin) {
      case 'royalties': {
        console.log(terminalColors.FgGreen + 'Royalties Plugin Configuration')
        let basisPoints: number = 0
        let numberOfCreators = 0
        let creators: Array<Creator> = []
        let authority: string | undefined
        let totalRoyalty: number = 0

        authority = await input({
          message: 'Who will be the authority of this plugin? Leave blank if this is you.',
          validate: (value) => {
            if (!value || isPublicKey(value)) return true
            return 'Value must be a valid public key'
          },
        })

        const basisPointsStr = await input({
          message: 'Royalty Percentage in basis points. 100 is equal to 1%',
          validate: (value) => {
            const num = parseInt(value)
            if (isNaN(num) || num <= 0) return 'Value must be greater than 0'
            return true
          },
        })
        basisPoints = parseInt(basisPointsStr)

        const creatorsStr = await input({
          message: 'Number of Creators?',
          validate: (value) => {
            const num = parseInt(value)
            if (isNaN(num) || num <= 0) return 'Value must be greater than 0'
            return true
          },
        })
        numberOfCreators = parseInt(creatorsStr)

        for (let index = 0; index < numberOfCreators; index++) {
          console.log(`${terminalColors.FgCyan}Configuring Creator ${index + 1} of ${numberOfCreators}`)
          const address = await input({
            message: `Creator ${index + 1} Address?`,
            validate: (value) => {
              if (isPublicKey(value)) return true
              return 'Value must be a valid public key'
            },
          })

          const percentageStr = await input({
            message: `Creator ${index + 1} Percentage? (remaining: ${100 - totalRoyalty}%)`,
            validate: (value) => {
              const num = parseInt(value)
              if (isNaN(num) || num <= 0) return 'Value must be greater than 0'
              if (num > (100 - totalRoyalty)) return `Value must not exceed remaining percentage (${100 - totalRoyalty}%)`
              return true
            },
          })
          const percentage = parseInt(percentageStr)
          creators.push({address: publicKey(address), percentage})
          totalRoyalty += percentage
        }

        if (totalRoyalty !== 100) {
          throw new Error('Total royalty percentage must equal 100%')
        }

        pluginData.royalties = {
          type: 'Royalties',
          creators,
          basisPoints,
          ruleSet: {type: 'None'},
          authority: authority ? {type: 'Address', address: publicKey(authority)} : {type: 'UpdateAuthority'},
        }
        break
      }
      case 'update': {
        console.log(terminalColors.FgGreen + 'Update Delegate Plugin Configuration')
        let authority: string | undefined
        let additionalDelegates: Array<string> = []

        authority = await input({
          message: 'Who will be the authority of this plugin? Leave blank if this is you.',
          validate: (value) => {
            if (!value || isPublicKey(value)) return true
            return 'Value must be a valid public key'
          },
        })

        const delegatesStr = await input({
          message: 'How many additional delegates do you want to add?',
          validate: (value) => {
            const num = parseInt(value)
            if (isNaN(num) || num <= 0) return 'Value must be greater than 0'
            return true
          },
        })
        const additionalDelegatesAmount = parseInt(delegatesStr)

        for (let index = 0; index < additionalDelegatesAmount; index++) {
          console.log(
            `${terminalColors.FgCyan}Configuring additional delegate ${index + 1} of ${additionalDelegatesAmount}`,
          )
          const delegate = await input({
            message: `Delegate ${index + 1} Address?`,
            validate: (value) => {
              if (isPublicKey(value)) return true
              return 'Value must be a valid public key'
            },
          })
          additionalDelegates.push(delegate)
        }

        pluginData.update = {
          type: 'UpdateDelegate',
          additionalDelegates: additionalDelegates.map((delegate) => publicKey(delegate)),
          authority: authority ? {type: 'Address', address: publicKey(authority)} : {type: 'UpdateAuthority'},
        }
        break
      }
      case 'burn': {
        console.log(terminalColors.FgGreen + 'Burn Plugin Configuration')
        let authority: string | undefined

        authority = await input({
          message: 'Who will be the authority of this plugin? Leave blank if this is you.',
          validate: (value) => {
            if (!value || isPublicKey(value)) return true
            return 'Value must be a valid public key'
          },
        })

        pluginData.burn = {
          type: 'BurnDelegate',
          authority: authority ? {type: 'Address', address: publicKey(authority)} : {type: 'UpdateAuthority'},
        }
        break
      }
      case 'pBurn': {
        console.log(terminalColors.FgGreen + 'Permanent Burn Plugin Configuration')
        let authority: string | undefined

        authority = await input({
          message: 'Who will be the authority of this plugin? Leave blank if this is you.',
          validate: (value) => {
            if (!value || isPublicKey(value)) return true
            return 'Value must be a valid public key'
          },
        })

        pluginData.pBurn = {
          type: 'PermanentBurnDelegate',
          authority: authority ? {type: 'Address', address: publicKey(authority)} : {type: 'UpdateAuthority'},
        }
        break
      }
      case 'transfer': {
        console.log(terminalColors.FgGreen + 'Transfer Plugin Configuration')
        let authority: string | undefined

        authority = await input({
          message: 'Who will be the authority of this plugin? Leave blank if this is you.',
          validate: (value) => {
            if (!value || isPublicKey(value)) return true
            return 'Value must be a valid public key'
          },
        })

        pluginData.transfer = {
          type: 'TransferDelegate',
          authority: authority ? {type: 'Address', address: publicKey(authority)} : {type: 'UpdateAuthority'},
        }
        break
      }
      case 'pTransfer': {
        console.log(terminalColors.FgGreen + 'Permanent Transfer Plugin Configuration')
        let authority: string | undefined

        authority = await input({
          message: 'Who will be the authority of this plugin? Leave blank if this is you.',
          validate: (value) => {
            if (!value || isPublicKey(value)) return true
            return 'Value must be a valid public key'
          },
        })

        pluginData.pTranfer = {
          type: 'PermanentTransferDelegate',
          authority: authority ? {type: 'Address', address: publicKey(authority)} : {type: 'UpdateAuthority'},
        }
        break
      }
      case 'freeze': {
        console.log(terminalColors.FgGreen + 'Freeze Plugin Configuration')
        let authority: string | undefined
        let frozen = false

        authority = await input({
          message: 'Who will be the authority of this plugin? Leave blank if this is you.',
          validate: (value) => {
            if (!value || isPublicKey(value)) return true
            return 'Value must be a valid public key'
          },
        })

        frozen = await confirm({
          message: 'Frozen?',
        })

        pluginData.freeze = {
          type: 'FreezeDelegate',
          frozen,
          authority: authority ? {type: 'Address', address: publicKey(authority)} : {type: 'UpdateAuthority'},
        }
        break
      }
      case 'pFreeze': {
        console.log(terminalColors.FgGreen + 'Permanent Freeze Plugin Configuration')
        let authority: string | undefined
        let frozen = false

        authority = await input({
          message: 'Who will be the authority of this plugin? Leave blank if this is you.',
          validate: (value) => {
            if (!value || isPublicKey(value)) return true
            return 'Value must be a valid public key'
          },
        })

        frozen = await confirm({
          message: 'Frozen?',
        })

        pluginData.pFreeze = {
          type: 'PermanentFreezeDelegate',
          frozen,
          authority: authority ? {type: 'Address', address: publicKey(authority)} : {type: 'UpdateAuthority'},
        }
        break
      }
      case 'masterEdition': {
        console.log(terminalColors.FgGreen + 'Master Edition Plugin Configuration')
        let authority: string | undefined
        let maxSupply: number | undefined
        let name: string | undefined
        let uri: string | undefined

        authority = await input({
          message: 'Who will be the authority of this plugin? Leave blank if this is you.',
          validate: (value) => {
            if (!value || isPublicKey(value)) return true
            return 'Value must be a valid public key'
          },
        })

        const maxSupplyStr = await input({
          message: 'How many prints will exist as maximum? Leave blank for open editions.',
        })
        maxSupply = maxSupplyStr ? parseInt(maxSupplyStr) : undefined

        name = await input({
          message: '(Optional) Name of the Editions (if different to the Collection Name)?',
        })

        uri = await input({
          message: '(Optional) URI of the Master Edition if different to the Collection uri?',
        })

        pluginData.masterEdition = {
          type: 'MasterEdition',
          authority: authority ? {type: 'Address', address: publicKey(authority)} : {type: 'UpdateAuthority'},
          maxSupply,
          name,
          uri,
        }
        break
      }
      case 'attributes': {
        console.log(terminalColors.FgGreen + 'Attributes Plugin Configuration')
        let authority: string | undefined
        let attributeList: Array<{key: string; value: string}> = []
        let attributeIndex = 0
        let continueAdding = true

        authority = await input({
          message: 'Who will be the authority of this plugin? Leave blank if this is you.',
          validate: (value) => {
            if (!value || isPublicKey(value)) return true
            return 'Value must be a valid public key'
          },
        })

        while (continueAdding) {
          console.log(`${terminalColors.FgCyan}Configuring Attribute ${attributeIndex + 1}`)
          const key = await input({
            message: `Attribute ${attributeIndex + 1} Key?`,
          })

          const value = await input({
            message: `Attribute ${attributeIndex + 1} Value?`,
          })

          attributeList.push({key, value})

          continueAdding = await confirm({
            message: 'Do you want to add another attribute?',
          })

          attributeIndex++
        }

        pluginData.attributes = {
          type: 'Attributes',
          authority: authority ? {type: 'Address', address: publicKey(authority)} : {type: 'UpdateAuthority'},
          attributeList,
        }
        break
      }
      case 'addBlocker': {
        console.log(terminalColors.FgGreen + 'AddBlocker Plugin Configuration')
        let authority: string | undefined

        authority = await input({
          message: 'Who will be the authority of this plugin? Leave blank if this is you.',
          validate: (value) => {
            if (!value || isPublicKey(value)) return true
            return 'Value must be a valid public key'
          },
        })

        pluginData.addBlocker = {
          type: 'AddBlocker',
          authority: authority ? {type: 'Address', address: publicKey(authority)} : {type: 'UpdateAuthority'},
        }
        break
      }
      case 'immutableMetadata': {
        console.log(terminalColors.FgGreen + 'Immutable Metadata Plugin Configuration')
        let authority: string | undefined

        authority = await input({
          message: 'Who will be the authority of this plugin? Leave blank if this is you.',
          validate: (value) => {
            if (!value || isPublicKey(value)) return true
            return 'Value must be a valid public key'
          },
        })

        pluginData.immutableMetadata = {
          type: 'ImmutableMetadata',
          authority: authority ? {type: 'Address', address: publicKey(authority)} : {type: 'UpdateAuthority'},
        }
        break
      }
      case 'autograph': {
        console.log(terminalColors.FgGreen + 'Autograph Plugin Configuration')
        let authority: string | undefined

        authority = await input({
          message: 'Who will be the authority of this plugin? Leave blank if this is you.',
          validate: (value) => {
            if (!value || isPublicKey(value)) return true
            return 'Value must be a valid public key'
          },
        })

        pluginData.authograph = {
          type: 'Autograph',
          authority: authority ? {type: 'Address', address: publicKey(authority)} : {type: 'UpdateAuthority'},
          signatures: [],
        }
        break
      }
      case 'verifiedCreators': {
        console.log(terminalColors.FgGreen + 'Verified Creators Plugin Configuration')
        let authority: string | undefined

        authority = await input({
          message: 'Who will be the authority of this plugin? Leave blank if this is you.',
          validate: (value) => {
            if (!value || isPublicKey(value)) return true
            return 'Value must be a valid public key'
          },
        })

        pluginData.verifiedCreators = {
          type: 'VerifiedCreators',
          authority: authority ? {type: 'Address', address: publicKey(authority)} : {type: 'UpdateAuthority'},
          signatures: [],
        }
        break
      }
      case 'edition': {
        console.log(terminalColors.FgGreen + 'Edition Plugin Configuration')
        let authority: string | undefined
        let editionNumber = 0

        authority = await input({
          message: 'Who will be the authority of this plugin? Leave blank if this is you.',
          validate: (value) => {
            if (!value || isPublicKey(value)) return true
            return 'Value must be a valid public key'
          },
        })

        const numberStr = await input({
          message: 'Edition number?',
          validate: (value) => {
            const num = parseInt(value)
            if (isNaN(num)) return 'Please enter a valid number'
            return true
          },
        })
        editionNumber = parseInt(numberStr)

        pluginData.edition = {
          type: 'Edition',
          authority: authority ? {type: 'Address', address: publicKey(authority)} : {type: 'UpdateAuthority'},
          number: editionNumber,
        }
        break
      }
      default:
    }
  }

  return pluginData
}

export default pluginConfigurator
