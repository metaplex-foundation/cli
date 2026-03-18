import { expect } from 'chai'
import { runCli } from '../../runCli'
import { createCoreAsset, createCoreCollection, stripAnsi } from './corehelpers'
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

    describe('info', () => {
        it('shows the asset signer PDA address and balance', async function () {
            const { assetId } = await createCoreAsset()

            const { stdout, stderr, code } = await runCli([
                'core', 'asset', 'execute', 'info', assetId
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
                'core', 'asset', 'execute', 'info', assetId
            ])

            const output = stripAnsi(stdout) + stripAnsi(stderr)
            expect(code).to.equal(0)
            expect(output).to.contain('Signer PDA:')
        })
    })

    describe('raw', () => {
        it('executes a raw SOL transfer instruction via --instruction', async function () {
            const { assetId } = await createCoreAsset()

            // Get the signer PDA
            const { stdout: signerOut, stderr: signerErr } = await runCli([
                'core', 'asset', 'execute', 'info', assetId
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
