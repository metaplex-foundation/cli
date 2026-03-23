import { expect } from 'chai'
import { runCli, KEYPAIR_PATH } from '../../runCli'
import { serializeInstruction } from '../../../src/lib/execute/deserializeInstruction.js'
import { stripAnsi } from '../core/corehelpers'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { keypairIdentity, publicKey } from '@metaplex-foundation/umi'
import fs from 'node:fs'

describe('toolbox transaction command', function () {
    this.timeout(120000)

    let walletAddress: string

    before(async () => {
        const umi = createUmi('http://127.0.0.1:8899')
        const keypairData = JSON.parse(fs.readFileSync(KEYPAIR_PATH, 'utf-8'))
        const kp = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(keypairData))
        umi.use(keypairIdentity(kp))
        walletAddress = kp.publicKey.toString()
    })

    it('executes a raw SOL transfer instruction', async function () {
        const destination = 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx'
        const lamports = 10000n

        const data = new Uint8Array(12)
        const view = new DataView(data.buffer)
        view.setUint32(0, 2, true)
        view.setBigUint64(4, lamports, true)

        const instruction = {
            programId: publicKey('11111111111111111111111111111111'),
            keys: [
                { pubkey: publicKey(walletAddress), isSigner: true, isWritable: true },
                { pubkey: publicKey(destination), isSigner: false, isWritable: true },
            ],
            data,
        }

        const serialized = serializeInstruction(instruction)

        const { stdout, stderr, code } = await runCli([
            'toolbox', 'transaction', '--instruction', serialized
        ])

        const output = stripAnsi(stdout) + stripAnsi(stderr)
        expect(code).to.equal(0)
        expect(output).to.contain('Executed 1 instruction(s)')
        expect(output).to.contain('Signature:')
    })

    it('fails when no instructions are provided', async function () {
        try {
            await runCli(['toolbox', 'transaction'])
            expect.fail('Expected command to fail without instructions')
        } catch (error: any) {
            expect(error.message).to.contain('You must provide instructions via --instruction or --stdin')
        }
    })
})
