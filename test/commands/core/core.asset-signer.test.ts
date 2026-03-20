import { expect } from 'chai'
import { findAssetSignerPda, mplCore } from '@metaplex-foundation/mpl-core'
import { transferSol, mplToolbox } from '@metaplex-foundation/mpl-toolbox'
import { generateSigner, keypairIdentity, publicKey } from '@metaplex-foundation/umi'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { spawn } from 'child_process'
import { CLI_PATH, TEST_RPC, KEYPAIR_PATH, runCliDirect } from '../../runCli'
import { extractAssetId, stripAnsi } from './corehelpers'
import { extractTreeAddress } from '../bg/bghelpers'

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

describe('asset-signer specific tests', function () {
    this.timeout(120000)

    let signerPda: string
    let ownerAddress: string
    let configPath: string
    let payerKeypairPath: string
    let publicTreeAddress: string
    const tempFiles: string[] = []

    before(async () => {
        const umi = createUmi(TEST_RPC).use(mplCore()).use(mplToolbox())
        const keypairData = JSON.parse(fs.readFileSync(KEYPAIR_PATH, 'utf-8'))
        const kp = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(keypairData))
        umi.use(keypairIdentity(kp))
        ownerAddress = kp.publicKey.toString()

        // Create the signing asset with the normal wallet (not through asset-signer)
        const { stdout: createOut, stderr: createErr } = await runCliDirect(
            ['core', 'asset', 'create', '--name', 'Signing Asset', '--uri', 'https://example.com/signing'],
            ['\n'],
        )
        const assetId = extractAssetId(stripAnsi(createOut)) || extractAssetId(stripAnsi(createErr))
        if (!assetId) throw new Error('Could not create signing asset')
        const [pda] = findAssetSignerPda(umi, { asset: publicKey(assetId) })
        signerPda = pda.toString()

        await transferSol(umi, {
            destination: pda,
            amount: { basisPoints: 500_000_000n, identifier: 'SOL', decimals: 9 },
        }).sendAndConfirm(umi)
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Write asset-signer config
        configPath = path.join(os.tmpdir(), `mplx-asset-signer-test-${Date.now()}.json`)
        fs.writeFileSync(configPath, JSON.stringify({
            rpcUrl: TEST_RPC,
            keypair: KEYPAIR_PATH,
            activeWallet: 'vault',
            wallets: [
                { name: 'owner', address: ownerAddress, path: KEYPAIR_PATH },
                { name: 'vault', type: 'asset-signer', asset: assetId, address: signerPda, payer: 'owner' },
            ],
        }, null, 2))
        tempFiles.push(configPath)

        // Generate and fund a separate fee payer keypair
        const newKp = generateSigner(umi)
        payerKeypairPath = path.join(os.tmpdir(), `mplx-test-payer-${Date.now()}.json`)
        fs.writeFileSync(payerKeypairPath, JSON.stringify(Array.from(newKp.secretKey)))
        tempFiles.push(payerKeypairPath)

        await umi.rpc.airdrop(newKp.publicKey, { basisPoints: 2_000_000_000n, identifier: 'SOL', decimals: 9 })
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Create a public tree (anyone can mint) for bg mint test
        const { stdout, stderr } = await runCliDirect([
            'bg', 'tree', 'create',
            '--maxDepth', '3',
            '--maxBufferSize', '8',
            '--canopyDepth', '1',
            '--public',
        ])
        const treeAddr = extractTreeAddress(stripAnsi(stdout + '\n' + stderr))
        if (!treeAddr) throw new Error('Could not create public tree')
        publicTreeAddress = treeAddr
        await new Promise(resolve => setTimeout(resolve, 2000))
    })

    after(() => {
        for (const f of tempFiles) {
            if (fs.existsSync(f)) fs.unlinkSync(f)
        }
    })

    it('transfers SOL from PDA with a different wallet paying fees', async function () {
        // Read the payer keypair to get its pubkey for balance checks
        const payerData = JSON.parse(fs.readFileSync(payerKeypairPath, 'utf-8'))
        const umi = createUmi(TEST_RPC).use(mplCore())
        const payerKp = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(payerData))
        const payerPubkey = payerKp.publicKey

        // Check payer balance before
        const balanceBefore = await umi.rpc.getBalance(payerPubkey)

        const { stdout, stderr, code } = await runCliWithConfig(
            ['toolbox', 'sol', 'transfer', '0.01', ownerAddress, '-p', payerKeypairPath],
            configPath,
        )

        const output = stripAnsi(stdout) + stripAnsi(stderr)
        expect(code).to.equal(0)
        expect(output).to.contain('SOL transferred successfully')

        // Verify the override payer's balance decreased (paid the fee)
        const balanceAfter = await umi.rpc.getBalance(payerPubkey)
        expect(balanceAfter.basisPoints < balanceBefore.basisPoints).to.be.true
    })

    it('mints a compressed NFT into a public tree as the PDA', async function () {
        const { stdout, stderr, code } = await runCliWithConfig(
            ['bg', 'nft', 'create', publicTreeAddress, '--name', 'PDA cNFT', '--uri', 'https://example.com/pda-cnft'],
            configPath,
        )

        const output = stripAnsi(stdout) + stripAnsi(stderr)
        expect(code).to.equal(0)
        expect(output).to.contain('Compressed NFT created successfully')
        expect(output).to.contain(signerPda)
    })
})
