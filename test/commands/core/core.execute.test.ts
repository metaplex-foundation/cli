import { expect } from 'chai'
import { runCli } from '../../runCli'
import { createCoreAsset, createCoreCollection, extractAssetId, stripAnsi } from './corehelpers'
import { createAndFundToken } from './executehelpers'
import { serializeInstruction } from '../../../src/lib/execute/deserializeInstruction.js'

const ASSET_SIGNER_PDA_PATTERN = /Signer PDA:\s+([a-zA-Z0-9]+)/

const extractSignerPda = (str: string) => {
    const match = str.match(ASSET_SIGNER_PDA_PATTERN)
    return match ? match[1] : null
}

describe('core asset execute commands', function () {
    this.timeout(120000)

    before(async () => {
        await runCli(['toolbox', 'sol', 'airdrop', '100', 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx'])
        await new Promise(resolve => setTimeout(resolve, 10000))
    })

    describe('signer', () => {
        it('shows the asset signer PDA address and balance', async function () {
            const { assetId } = await createCoreAsset()

            const { stdout, stderr, code } = await runCli([
                'core', 'asset', 'execute', 'signer', assetId
            ])

            const cleanStderr = stripAnsi(stderr)
            const cleanStdout = stripAnsi(stdout)
            const output = cleanStdout + cleanStderr

            expect(code).to.equal(0)
            expect(output).to.contain('Signer PDA:')
            expect(output).to.contain('SOL Balance:')

            const signerPda = extractSignerPda(output)
            expect(signerPda).to.match(/^[a-zA-Z0-9]+$/)
        })

        it('shows the signer PDA for an asset in a collection', async function () {
            const { collectionId } = await createCoreCollection()
            const { assetId } = await createCoreAsset(collectionId)

            const { stdout, stderr, code } = await runCli([
                'core', 'asset', 'execute', 'signer', assetId
            ])

            const output = stripAnsi(stdout) + stripAnsi(stderr)
            expect(code).to.equal(0)
            expect(output).to.contain('Signer PDA:')
        })
    })

    describe('transfer-sol', () => {
        it('transfers SOL from the asset signer PDA', async function () {
            const { assetId } = await createCoreAsset()

            // Get the signer PDA
            const { stdout: signerOut, stderr: signerErr } = await runCli([
                'core', 'asset', 'execute', 'signer', assetId
            ])
            const signerPda = extractSignerPda(stripAnsi(signerOut) + stripAnsi(signerErr))
            expect(signerPda).to.be.ok

            // Fund the signer PDA
            await runCli(['toolbox', 'sol', 'transfer', '0.1', signerPda!])
            await new Promise(resolve => setTimeout(resolve, 5000))

            // Transfer SOL from the signer PDA
            const destination = 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx'
            const { stdout, stderr, code } = await runCli([
                'core', 'asset', 'execute', 'transfer-sol', assetId,
                '--amount', '0.01', '--destination', destination
            ])

            const output = stripAnsi(stdout) + stripAnsi(stderr)
            expect(code).to.equal(0)
            expect(output).to.contain('SOL transferred from asset signer')
            expect(output).to.contain('Signature:')
        })

        it('fails with an invalid amount', async function () {
            const { assetId } = await createCoreAsset()

            try {
                await runCli([
                    'core', 'asset', 'execute', 'transfer-sol', assetId,
                    '--amount', '-1', '--destination', 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx'
                ])
                expect.fail('Expected command to fail with negative amount')
            } catch (error: any) {
                expect(error.message).to.contain('Amount must be a positive number')
            }
        })
    })

    describe('transfer-token', () => {
        it('transfers SPL tokens from the asset signer PDA', async function () {
            const { assetId } = await createCoreAsset()

            // Get the signer PDA
            const { stdout: signerOut, stderr: signerErr } = await runCli([
                'core', 'asset', 'execute', 'signer', assetId
            ])
            const signerPda = extractSignerPda(stripAnsi(signerOut) + stripAnsi(signerErr))
            expect(signerPda).to.be.ok

            // Create a fungible token and mint 1000 tokens to the asset signer PDA
            const mintAddress = await createAndFundToken(signerPda!, 1000, 0)
            await new Promise(resolve => setTimeout(resolve, 5000))

            // Transfer 100 tokens from the signer PDA to destination
            const destination = 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx'
            const { stdout, stderr, code } = await runCli([
                'core', 'asset', 'execute', 'transfer-token', assetId,
                '--mint', mintAddress, '--amount', '100', '--destination', destination
            ])

            const output = stripAnsi(stdout) + stripAnsi(stderr)
            expect(code).to.equal(0)
            expect(output).to.contain('Tokens transferred from asset signer')
            expect(output).to.contain('Signature:')
        })
    })

    describe('transfer-asset', () => {
        it('transfers an asset owned by the signer PDA to a new owner', async function () {
            // Create the "signing" asset (the one whose PDA will own another asset)
            const { assetId: signingAssetId } = await createCoreAsset()

            // Get the signer PDA
            const { stdout: signerOut, stderr: signerErr } = await runCli([
                'core', 'asset', 'execute', 'signer', signingAssetId
            ])
            const signerPda = extractSignerPda(stripAnsi(signerOut) + stripAnsi(signerErr))
            expect(signerPda).to.be.ok

            // Create a second asset owned by the signer PDA
            const { stdout: createOut, stderr: createErr, code: createCode } = await runCli([
                'core', 'asset', 'create',
                '--name', 'Owned by PDA',
                '--uri', 'https://example.com/pda-owned',
                '--owner', signerPda!,
            ], ['\n'])
            expect(createCode).to.equal(0)

            const targetAssetId = extractAssetId(stripAnsi(createOut)) || extractAssetId(stripAnsi(createErr))
            expect(targetAssetId).to.be.ok

            // Transfer the target asset from the signer PDA to a new owner
            const newOwner = 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx'
            const { stdout, stderr, code } = await runCli([
                'core', 'asset', 'execute', 'transfer-asset', signingAssetId,
                '--asset', targetAssetId!, '--new-owner', newOwner
            ])

            const output = stripAnsi(stdout) + stripAnsi(stderr)
            expect(code).to.equal(0)
            expect(output).to.contain('Asset transferred from signer PDA')
            expect(output).to.contain('Signature:')

            // Verify ownership changed
            const { stdout: fetchOut } = await runCli(['core', 'asset', 'fetch', targetAssetId!])
            expect(stripAnsi(fetchOut)).to.contain(newOwner)
        })

        it('fails when target asset is not owned by the signer PDA', async function () {
            const { assetId: signingAssetId } = await createCoreAsset()
            const { assetId: otherAssetId } = await createCoreAsset()

            try {
                await runCli([
                    'core', 'asset', 'execute', 'transfer-asset', signingAssetId,
                    '--asset', otherAssetId, '--new-owner', 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx'
                ])
                expect.fail('Expected command to fail when target is not owned by PDA')
            } catch (error: any) {
                expect(error.message).to.contain('not owned by the asset signer PDA')
            }
        })
    })

    describe('raw', () => {
        it('executes a raw SOL transfer instruction via --instruction', async function () {
            const { assetId } = await createCoreAsset()

            // Get the signer PDA
            const { stdout: signerOut, stderr: signerErr } = await runCli([
                'core', 'asset', 'execute', 'signer', assetId
            ])
            const signerPda = extractSignerPda(stripAnsi(signerOut) + stripAnsi(signerErr))
            expect(signerPda).to.be.ok

            // Fund the signer PDA
            await runCli(['toolbox', 'sol', 'transfer', '0.1', signerPda!])
            await new Promise(resolve => setTimeout(resolve, 5000))

            // Build a system program Transfer instruction manually:
            // System program transfer = discriminator 2 (u32 LE) + lamports (u64 LE)
            const SYSTEM_PROGRAM = '11111111111111111111111111111111'
            const destination = 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx'
            const lamports = 10000n // 0.00001 SOL

            const data = new Uint8Array(12)
            const view = new DataView(data.buffer)
            view.setUint32(0, 2, true) // Transfer instruction discriminator
            view.setBigUint64(4, lamports, true) // Amount in lamports

            const instruction = {
                programId: SYSTEM_PROGRAM,
                keys: [
                    { pubkey: signerPda!, isSigner: true, isWritable: true },
                    { pubkey: destination, isSigner: false, isWritable: true },
                ],
                data,
            }

            const serialized = serializeInstruction(instruction as any)

            const { stdout, stderr, code } = await runCli([
                'core', 'asset', 'execute', 'raw', assetId,
                '--instruction', serialized
            ])

            const output = stripAnsi(stdout) + stripAnsi(stderr)
            expect(code).to.equal(0)
            expect(output).to.contain('Executed 1 instruction(s) via asset signer')
            expect(output).to.contain('Signature:')
        })

        it('fails when no instructions are provided', async function () {
            const { assetId } = await createCoreAsset()

            try {
                await runCli([
                    'core', 'asset', 'execute', 'raw', assetId
                ])
                expect.fail('Expected command to fail without instructions')
            } catch (error: any) {
                expect(error.message).to.contain('You must provide instructions via --instruction or --stdin')
            }
        })
    })
})
