import type { Signer, Umi } from '@metaplex-foundation/umi'

import { generateSigner } from '@metaplex-foundation/umi'
import { Flags } from '@oclif/core'

import { createSignerFromPath } from './Context.js'

export const mintKeypairFlag = Flags.file({
  description: 'Path to a keypair file to use as the mint/asset address (vanity key)',
  required: false,
})

export async function resolveMintSigner(umi: Umi, path?: string): Promise<Signer> {
  return path ? createSignerFromPath(path) : generateSigner(umi)
}
