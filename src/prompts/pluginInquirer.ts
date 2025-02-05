import {
  CreateCollectionArgsPlugin,
  Creator
} from '@metaplex-foundation/mpl-core'
import { isPublicKey, publicKey } from '@metaplex-foundation/umi'
import inquirer from 'inquirer'
import { Plugin, PluginData } from '../lib/types/pluginData.js'
import { terminalColors } from '../lib/util.js'

export const mapPluginDataToArray = (data: PluginData): CreateCollectionArgsPlugin[] => {
  return Object.values(data)
}

const pluginConfigurator = async (plugins: Array<Plugin>) => {
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

        await inquirer
          .prompt([
            {
              name: 'authority',
              type: 'input',
              message: 'Who will be the authority of this plugin? Leave blank if this is you.',
              validate: (value) => {
                if (!value || isPublicKey(value)) return true
                return 'Value must be a valid public key'
              },
            },
            {
              name: 'basisPoints',
              type: 'number',
              message: 'Royalty Percentage in basis points. 100 is equal to 1%',
              validate: (value) => {
                if (value != undefined && value > 0) return true

                return 'Value must be greater than 0'
              },
              required: true,
            },
            {
              name: 'creators',
              type: 'number',
              message: 'Number of Creators?',
              validate: (value) => {
                if (value != undefined && value > 0) return true

                return 'Value must be greater than 0'
              },
              required: true,
            },
          ])
          .then((answers) => {
            basisPoints = answers.basisPoints
            authority = answers.authority
            numberOfCreators = answers.creators
          })

        for (let index = 0; index < numberOfCreators; index++) {
          console.log(terminalColors.FgCyan + `Configuring Creator ${index + 1} of ${numberOfCreators}`)
          await inquirer
            .prompt([
              {
                name: 'address',
                type: 'input',
                message: `Creator ${index + 1} Address?`,
                required: true,
                validate: (value) => {
                  if (isPublicKey(value)) return true
                  return 'Value must be a valid public key'
                },
              },
              {
                name: 'share',
                type: 'number',
                message: `The percent of royalty to recieve? You have ${100 - totalRoyalty}% left.`,
                required: true,
                validate: (value) => {
                  if (value != undefined && value > 0 && value <= 100 - totalRoyalty) return true
                  return 'Value must be greater than 0 or equal to or lower than the remaining percentage'
                },
              },
            ])
            .then((answers) => {
              creators.push({address: answers.address, percentage: answers.share})
              totalRoyalty += answers.share
            })
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
        let additionalDelegatesAmount: number = 0
        let additionalDelegates: Array<string> = []

        await inquirer
          .prompt([
            {
              name: 'authority',
              type: 'input',
              message: 'Who will be the authority of this plugin?',
              required: true,
              validate: (value) => {
                if (!value || isPublicKey(value)) return true
                return 'Value must be a valid public key'
              },
            },
          ])
          .then((answers) => {
            authority = answers.authority
          })

        if (additionalDelegatesAmount > 0) {
          for (let index = 0; index < additionalDelegatesAmount; index++) {
            console.log(
              terminalColors.FgCyan + `Configuring additional delegate ${index + 1} of ${additionalDelegatesAmount}`,
            )
            await inquirer
              .prompt([
                {
                  name: 'delegate',
                  type: 'input',
                  message: `Delegate ${index + 1} Address?`,
                  required: true,
                  validate: (value) => {
                    if (isPublicKey(value)) return true
                    return 'Value must be a valid public key'
                  },
                },
              ])
              .then((answers) => {
                additionalDelegates.push(answers.delegate)
              })
          }
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

        await inquirer
          .prompt([
            {
              name: 'authority',
              type: 'input',
              message: 'Who will be the authority of this plugin? Leave blank if this is you.',
              validate: (value) => {
                if (!value || isPublicKey(value)) return true
                return 'Value must be a valid public key'
              },
            },
          ])
          .then((answers) => {
            authority = answers.authority
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

        await inquirer
          .prompt([
            {
              name: 'authority',
              type: 'input',
              message: 'Who will be the authority of this plugin? Leave blank if this is you.',
              validate: (value) => {
                if (!value || isPublicKey(value)) return true
                return 'Value must be a valid public key'
              },
            },
          ])
          .then((answers) => {
            authority = answers.authority
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

        await inquirer
          .prompt([
            {
              name: 'authority',
              type: 'input',
              message: 'Who will be the authority of this plugin? Leave blank if this is you.',
              validate: (value) => {
                if (!value || isPublicKey(value)) return true
                return 'Value must be a valid public key'
              },
            },
          ])
          .then((answers) => {
            authority = answers.authority
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

        await inquirer
          .prompt([
            {
              name: 'authority',
              type: 'input',
              message: 'Who will be the authority of this plugin? Leave blank if this is you.',
              validate: (value) => {
                if (!value || isPublicKey(value)) return true
                return 'Value must be a valid public key'
              },
            },
          ])
          .then((answers) => {
            authority = answers.authority
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
        let frozen: boolean = false

        await inquirer
          .prompt([
            {
              name: 'authority',
              type: 'input',
              message: 'Who will be the authority of this plugin? Leave blank if this is you.',
              validate: (value) => {
                if (!value || isPublicKey(value)) return true
                return 'Value must be a valid public key'
              },
            },
            {
              name: 'frozen',
              type: 'confirm',
              message: 'Frozen?',
            },
          ])
          .then((answers) => {
            authority = answers.authority
            frozen = answers.frozen
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
        let frozen: boolean = false

        await inquirer
          .prompt([
            {
              name: 'authority',
              type: 'input',
              message: 'Who will be the authority of this plugin? Leave blank if this is you.',
              validate: (value) => {
                if (!value || isPublicKey(value)) return true
                return 'Value must be a valid public key'
              },
            },
            {
              name: 'frozen',
              type: 'confirm',
              message: 'Frozen?',
            },
          ])
          .then((answers) => {
            authority = answers.authority
            frozen = answers.frozen
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

        await inquirer
          .prompt([
            {
              name: 'authority',
              type: 'input',
              message: 'Who will be the authority of this plugin? Leave blank if this is you.',
              validate: (value) => {
                if (!value || isPublicKey(value)) return true
                return 'Value must be a valid public key'
              },
            },
            {
              name: 'maxSupply',
              type: 'number',
              message: 'How many prints will exist as maximum? Leave blank for open editions.',
            },
            {
              name: 'name',
              type: 'input',
              message: '(Optional) Name of the Editions (if different to the Collection Name)?',
            },
            {
              name: 'uri',
              type: 'input',
              message: '(Optional) URI of the Master Edition if different to the Collection uri?',
            },
          ])
          .then((answers) => {
            authority = answers.authority
            maxSupply = answers.maxSupply
            name = answers.name
            uri = answers.uri
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

        await inquirer
          .prompt([
            {
              name: 'authority',
              type: 'input',
              message: 'Who will be the authority of this plugin? Leave blank if this is you.',
              validate: (value) => {
                if (!value || isPublicKey(value)) return true
                return 'Value must be a valid public key'
              },
            },
          ])
          .then((answers) => {
            authority = answers.authority
          })

        while (continueAdding) {
          console.log(terminalColors.FgCyan + `Configuring Attribute ${attributeIndex + 1}`)
          await inquirer
            .prompt([
              {
                name: 'key',
                type: 'input',
                message: `Attribute ${attributeIndex + 1} Key?`,
                required: true,
              },
              {
                name: 'value',
                type: 'input',
                message: `Attribute ${attributeIndex + 1} Value?`,
                required: true,
              },
              {
                name: 'continue',
                type: 'confirm',
                message: 'Do you want to add another attribute?',
              },
            ])
            .then((answers) => {
              attributeList.push({key: answers.key, value: answers.value})
              continueAdding = answers.continue
              attributeIndex++
            })
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

        await inquirer
          .prompt([
            {
              name: 'authority',
              type: 'input',
              message: 'Who will be the authority of this plugin? Leave blank if this is you.',
              validate: (value) => {
                if (!value || isPublicKey(value)) return true
                return 'Value must be a valid public key'
              },
            },
          ])
          .then((answers) => {
            authority = answers.authority
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

        await inquirer
          .prompt([
            {
              name: 'authority',
              type: 'input',
              message: 'Who will be the authority of this plugin? Leave blank if this is you.',
              validate: (value) => {
                if (!value || isPublicKey(value)) return true
                return 'Value must be a valid public key'
              },
            },
          ])
          .then((answers) => {
            authority = answers.authority
          })
        pluginData.immutableMetadata = {
          type: 'ImmutableMetadata',
          authority: authority ? {type: 'Address', address: publicKey(authority)} : {type: 'UpdateAuthority'},
        }
      }
      case 'autograph': {
        console.log(terminalColors.FgGreen + 'Autograph Plugin Configuration')
        let authority: string | undefined

        await inquirer
          .prompt([
            {
              name: 'authority',
              type: 'input',
              message: 'Who will be the authority of this plugin? Leave blank if this is you.',
              validate: (value) => {
                if (!value || isPublicKey(value)) return true
                return 'Value must be a valid public key'
              },
            },
          ])
          .then((answers) => {
            authority = answers.authority
          })
        pluginData.authograph = {
          type: 'Autograph',
          authority: authority ? {type: 'Address', address: publicKey(authority)} : {type: 'UpdateAuthority'},
          signatures: [],
        }
      }
      case 'verifiedCreators': {
        console.log(terminalColors.FgGreen + 'Verified Creators Plugin Configuration')
        let authority: string | undefined
        let verifiedCreators: Array<{address: string; verified: boolean}> = []

        await inquirer
          .prompt([
            {
              name: 'authority',
              type: 'input',
              message: 'Who will be the authority of this plugin? Leave blank if this is you.',
              validate: (value) => {
                if (!value || isPublicKey(value)) return true
                return 'Value must be a valid public key'
              },
            },
            //TODO: Add self as verified creator. Will need to pass in umi identity/publicKey
          ])
          .then((answers) => {
            authority = answers.authority
          })
        pluginData.verifiedCreators = {
          type: 'VerifiedCreators',
          authority: authority ? {type: 'Address', address: publicKey(authority)} : {type: 'UpdateAuthority'},
          signatures: [],
        }
      }
      case 'edition': {
        console.log(terminalColors.FgGreen + 'Edition Plugin Configuration')
        let authority: string | undefined
        let editionNumber: number = 0

        await inquirer
          .prompt([
            {
              name: 'authority',
              type: 'input',
              message: 'Who will be the authority of this plugin? Leave blank if this is you.',
              validate: (value) => {
                if (!value || isPublicKey(value)) return true
                return 'Value must be a valid public key'
              },
            },
            {
              name: 'number',
              type: 'number',
              message: 'Edition number?',
              required: true,
            },
          ])
          .then((answers) => {
            authority = answers.authority
            editionNumber = answers.number
          })
        pluginData.edition = {
          type: 'Edition',
          authority: authority ? {type: 'Address', address: publicKey(authority)} : {type: 'UpdateAuthority'},
          number: editionNumber,
        }
      }
      default:
    }
  }

  return pluginData
}

export default pluginConfigurator
