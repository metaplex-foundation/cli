import { createSignerFromKeypair, Umi } from '@metaplex-foundation/umi'

export function createSignerFromKeypairBytes(umi: Umi, secretKey: Uint8Array) {
    const keypair = umi.eddsa.createKeypairFromSecretKey(secretKey)
    return createSignerFromKeypair(umi, keypair)
}
