/**
 * Mocha root hook plugin for asset-signer mode.
 *
 * When MPLX_TEST_WALLET_MODE=asset-signer, this hook:
 * 1. Creates a signing asset owned by the test keypair
 * 2. Funds its signer PDA with SOL
 * 3. Writes a temp config with the asset-signer wallet active
 * 4. Registers the config path so runCli uses it
 */

import { findAssetSignerPda, mplCore } from '@metaplex-foundation/mpl-core'
import { transferSol, mplToolbox } from '@metaplex-foundation/mpl-toolbox'
import { keypairIdentity, publicKey } from '@metaplex-foundation/umi'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { TEST_RPC, KEYPAIR_PATH, isAssetSignerMode, setAssetSignerConfig } from './runCli'
import { createCoreAsset } from './commands/core/corehelpers'

let configPath: string | undefined

export const mochaHooks = {
    async beforeAll() {
        if (!isAssetSignerMode()) return

        console.log('  Setting up asset-signer wallet for test suite...')

        const umi = createUmi(TEST_RPC).use(mplCore()).use(mplToolbox())
        const keypairData = JSON.parse(fs.readFileSync(KEYPAIR_PATH, 'utf-8'))
        const kp = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(keypairData))
        umi.use(keypairIdentity(kp))

        // Create a signing asset
        const { assetId } = await createCoreAsset()
        const [pda] = findAssetSignerPda(umi, { asset: publicKey(assetId) })

        // Fund the PDA
        await transferSol(umi, {
            destination: pda,
            amount: { basisPoints: 10_000_000_000n, identifier: 'SOL', decimals: 9 },
        }).sendAndConfirm(umi)
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Write the config
        configPath = path.join(os.tmpdir(), `mplx-asset-signer-test-${Date.now()}.json`)
        fs.writeFileSync(configPath, JSON.stringify({
            rpcUrl: TEST_RPC,
            keypair: KEYPAIR_PATH,
            activeWallet: 'vault',
            wallets: [
                { name: 'owner', address: kp.publicKey.toString(), path: KEYPAIR_PATH },
                { name: 'vault', type: 'asset-signer', asset: assetId, address: pda.toString(), payer: 'owner' },
            ],
        }, null, 2))

        setAssetSignerConfig(configPath)
        console.log(`  Asset-signer wallet ready: PDA ${pda.toString().slice(0, 8)}...`)
    },

    afterAll() {
        if (configPath && fs.existsSync(configPath)) {
            fs.unlinkSync(configPath)
        }
    },
}
