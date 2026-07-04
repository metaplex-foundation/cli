import { Flags } from '@oclif/core'

export const mintKeypairFlag = Flags.file({
  description: 'Path to a keypair file to use as the mint/asset address (vanity key)',
  required: false,
})
