import { expect } from 'chai'
import { findAssetSignerPda, mplCore } from '@metaplex-foundation/mpl-core'
import { transferSol, mplToolbox } from '@metaplex-foundation/mpl-toolbox'
import { generateSigner, keypairIdentity, publicKey } from '@metaplex-foundation/umi'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { spawn } from 'child_process'
import { runCli, CLI_PATH, TEST_RPC, KEYPAIR_PATH } from '../../runCli'
import { createCoreAsset, extractAssetId, stripAnsi } from './corehelpers'

/**
 * Runs the CLI with a custom config (for asset-signer wallet tests).
 * Uses -c instead of -k so the asset-signer config is picked up.
 */
const runCliWithConfig = (
    args: string[],
    configPath: string,
    stdin?: string[],
): Promise<{ stdout: string; stderr: string; code: number }> => {
    return new Promise((resolve, reject) => {
        const child = spawn('node', [CLI_PATH, ...args, '-r', TEST_RPC, '-c', configPath], {
            stdio: ['pipe', 'pipe', 'pipe'],
        })

        let stdout = ''
        let stderr = ''

        child.stdout.on('data', (data) => { stdout += data.toString() })
        child.stderr.on('data', (data) => { stderr += data.toString() })
        child.on('error', reject)
        child.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Process failed with code ${code}\nstderr: ${stderr}`))
            } else {
                resolve({ stdout, stderr, code: 0 })
            }
        })

        if (stdin) {
            for (const input of stdin) child.stdin.write(input)
            child.stdin.end()
        }
    })
}

/**
 * Writes a temporary config file with the asset-signer wallet active.
 */
const writeAssetSignerConfig = (assetId: string, pdaAddress: string, ownerAddress: string): string => {
    const config = {
        rpcUrl: TEST_RPC,
        keypair: KEYPAIR_PATH,
        activeWallet: 'vault',
        wallets: [
            {
                name: 'owner',
                address: ownerAddress,
                path: KEYPAIR_PATH,
            },
            {
                name: 'vault',
                type: 'asset-signer',
                asset: assetId,
                address: pdaAddress,
                payer: 'owner',
            },
        ],
    }

    const configPath = path.join(os.tmpdir(), `mplx-asset-signer-test-${Date.now()}.json`)
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
    return configPath
}

describe('asset-signer wallet', function () {
    this.timeout(120000)

    let signingAssetId: string
    let signerPda: string
    let ownerAddress: string
    let configPath: string
    const tempFiles: string[] = []

    before(async () => {
        const umi = createUmi(TEST_RPC).use(mplCore()).use(mplToolbox())
        const keypairData = JSON.parse(fs.readFileSync(KEYPAIR_PATH, 'utf-8'))
        const kp = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(keypairData))
        umi.use(keypairIdentity(kp))
        ownerAddress = kp.publicKey.toString()

        // Create the signing asset
        const { assetId } = await createCoreAsset()
        signingAssetId = assetId

        // Derive the PDA and fund it
        const [pda] = findAssetSignerPda(umi, { asset: publicKey(signingAssetId) })
        signerPda = pda.toString()

        await transferSol(umi, {
            destination: pda,
            amount: { basisPoints: 500_000_000n, identifier: 'SOL', decimals: 9 },
        }).sendAndConfirm(umi)
        // Wait for RPC state propagation on localnet
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Write the asset-signer config
        configPath = writeAssetSignerConfig(signingAssetId, signerPda, ownerAddress)
        tempFiles.push(configPath)
    })

    after(() => {
        for (const f of tempFiles) {
            if (fs.existsSync(f)) fs.unlinkSync(f)
        }
    })

    describe('SOL operations', () => {
        it('shows the PDA balance when checking balance', async function () {
            const { stdout, stderr, code } = await runCliWithConfig(
                ['toolbox', 'sol', 'balance'],
                configPath,
            )

            const output = stripAnsi(stdout) + stripAnsi(stderr)
            expect(code).to.equal(0)
            // Should show the shortened PDA address, not the wallet address
            expect(output).to.contain(signerPda.slice(0, 4))
            expect(output).not.to.contain(ownerAddress.slice(0, 4))
        })

        it('transfers SOL from the PDA', async function () {
            const { stdout, stderr, code } = await runCliWithConfig(
                ['toolbox', 'sol', 'transfer', '0.01', ownerAddress],
                configPath,
            )

            const output = stripAnsi(stdout) + stripAnsi(stderr)
            expect(code).to.equal(0)
            expect(output).to.contain('SOL transferred successfully')
        })
    })

    describe('Core asset transfer', () => {
        it('transfers a PDA-owned asset to a new owner', async function () {
            // Create asset owned by the PDA (using standard CLI, not asset-signer)
            const { stdout: out, stderr: err, code: c } = await runCli(
                ['core', 'asset', 'create', '--name', 'PDA Owned', '--uri', 'https://example.com/pda', '--owner', signerPda],
                ['\n'],
            )
            expect(c).to.equal(0)
            const targetAssetId = extractAssetId(stripAnsi(out)) || extractAssetId(stripAnsi(err))
            expect(targetAssetId).to.be.ok

            // Transfer it via asset-signer wallet
            const { stdout, stderr, code } = await runCliWithConfig(
                ['core', 'asset', 'transfer', targetAssetId!, ownerAddress],
                configPath,
            )

            const output = stripAnsi(stdout) + stripAnsi(stderr)
            expect(code).to.equal(0)
            expect(output).to.contain('Asset transferred')
        })
    })

    describe('separate fee payer via -p', () => {
        let payerKeypairPath: string

        before(async function () {
            // Generate and fund a second keypair
            const umi = createUmi(TEST_RPC).use(mplCore()).use(mplToolbox())
            const keypairData = JSON.parse(fs.readFileSync(KEYPAIR_PATH, 'utf-8'))
            const mainKp = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(keypairData))
            umi.use(keypairIdentity(mainKp))

            const newKp = generateSigner(umi)
            payerKeypairPath = path.join(os.tmpdir(), `mplx-test-payer-${Date.now()}.json`)
            fs.writeFileSync(payerKeypairPath, JSON.stringify(Array.from(newKp.secretKey)))
            tempFiles.push(payerKeypairPath)

            await umi.rpc.airdrop(newKp.publicKey, { basisPoints: 2_000_000_000n, identifier: 'SOL', decimals: 9 })
            await new Promise(resolve => setTimeout(resolve, 2000))
        })

        it('transfers SOL from PDA with a different wallet paying fees', async function () {
            const { stdout, stderr, code } = await runCliWithConfig(
                ['toolbox', 'sol', 'transfer', '0.01', ownerAddress, '-p', payerKeypairPath],
                configPath,
            )

            const output = stripAnsi(stdout) + stripAnsi(stderr)
            expect(code).to.equal(0)
            expect(output).to.contain('SOL transferred successfully')
        })
    })
})
