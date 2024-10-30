import {createSignerFromKeypair, Signer} from '@metaplex-foundation/umi'
import {PathOrFileDescriptor} from 'fs'
import {readJsonSync} from './file.js'
import {fromWeb3JsKeypair} from '@metaplex-foundation/umi-web3js-adapters'
import {createUmi} from '@metaplex-foundation/umi-bundle-defaults'
import {Keypair as Web3JsKeypair} from '@solana/web3.js'

export function createSignerFromFile(path: PathOrFileDescriptor): Signer {
  if (!path) {
    throw new Error('Keypair is required!')
  }

  const secretKey = new Uint8Array(readJsonSync(path))
  const keypair = fromWeb3JsKeypair(Web3JsKeypair.fromSecretKey(secretKey))

  // create a temporary umi to access eddsa methods
  const umi = createUmi('https://api.devnet.solana.com')

  const signer = createSignerFromKeypair(umi, keypair)

  return signer
}
