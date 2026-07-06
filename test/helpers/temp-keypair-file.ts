import { Signer, Umi, generateSigner } from '@metaplex-foundation/umi'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import fs from 'node:fs'
import os from 'node:os'
import { join } from 'node:path'

import { TEST_RPC } from '../runCli.js'

export function createTempKeypairFile(umi: Umi = createUmi(TEST_RPC)): {
  cleanup: () => void
  mintKeypair: Signer
  mintKeypairPath: string
} {
  const mintKeypair = generateSigner(umi)
  const mintKeypairPath = join(os.tmpdir(), `mplx-test-mint-${Date.now()}.json`)
  fs.writeFileSync(mintKeypairPath, JSON.stringify([...mintKeypair.secretKey]))

  return {
    cleanup() {
      if (fs.existsSync(mintKeypairPath)) {
        fs.unlinkSync(mintKeypairPath)
      }
    },
    mintKeypair,
    mintKeypairPath,
  }
}
