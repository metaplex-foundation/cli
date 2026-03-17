import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { createFungible, mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata'
import { mplCore } from '@metaplex-foundation/mpl-core'
import {
    createAssociatedToken,
    findAssociatedTokenPda,
    mintTokensTo,
    mplToolbox,
} from '@metaplex-foundation/mpl-toolbox'
import {
    generateSigner,
    keypairIdentity,
    percentAmount,
    publicKey,
} from '@metaplex-foundation/umi'
import fs from 'node:fs'
import path from 'node:path'

const TEST_RPC = 'http://127.0.0.1:8899'
const KEYPAIR_PATH = path.join(process.cwd(), 'test-files', 'key.json')

/**
 * Creates a umi instance configured with the test keypair and local validator.
 */
export function createTestUmi() {
    const umi = createUmi(TEST_RPC)
        .use(mplCore())
        .use(mplToolbox())
        .use(mplTokenMetadata())
    const keypairData = JSON.parse(fs.readFileSync(KEYPAIR_PATH, 'utf-8'))
    const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(keypairData))
    umi.use(keypairIdentity(keypair))
    return umi
}

/**
 * Creates a fungible SPL token and mints tokens to a specified owner.
 * Returns the mint address.
 */
export async function createAndFundToken(
    owner: string,
    amount: number,
    decimals: number = 0,
): Promise<string> {
    const umi = createTestUmi()
    const mint = generateSigner(umi)
    const ownerPubkey = publicKey(owner)

    const tx = createFungible(umi, {
        mint,
        name: 'Test Token',
        symbol: 'TST',
        uri: 'https://example.com/test-token.json',
        decimals,
        sellerFeeBasisPoints: percentAmount(0),
    })
        .add(createAssociatedToken(umi, {
            mint: mint.publicKey,
            owner: ownerPubkey,
        }))
        .add(mintTokensTo(umi, {
            mint: mint.publicKey,
            token: findAssociatedTokenPda(umi, { mint: mint.publicKey, owner: ownerPubkey }),
            amount,
        }))

    await tx.sendAndConfirm(umi)
    return mint.publicKey.toString()
}
