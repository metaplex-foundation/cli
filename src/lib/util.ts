import {TransactionSignature} from '@metaplex-foundation/umi'
import {base58} from '@metaplex-foundation/umi/serializers'
import {createUmi} from '@metaplex-foundation/umi-bundle-defaults'

export const txSignatureToString = (sig: TransactionSignature): string => base58.deserialize(sig)[0]

export const jsonStringify = (obj: any, spaces?: number | string) =>
  JSON.stringify(obj, (_key, value) => (typeof value === 'bigint' ? `${value.toString()}n` : value), spaces)

export const jsonParse = (str: string, parseBigint: boolean = false) => {
  if (parseBigint) {
    return JSON.parse(str, (_key, value) => {
      if (typeof value === 'string' && value.endsWith('n')) {
        const bigintStr = value.slice(0, -1)
        if (/^[+-]?\d+$/.test(bigintStr)) {
          return BigInt(bigintStr)
        }
      }

      return value
    })
  }

  return JSON.parse(str)
}

// create a temporary umi to access eddsa/keygen methods
export const DUMMY_UMI = createUmi('https://api.devnet.solana.com')
