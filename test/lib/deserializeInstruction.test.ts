import { expect } from 'chai'
import { Instruction, PublicKey } from '@metaplex-foundation/umi'
import { deserializeInstruction, serializeInstruction } from '../../src/lib/execute/deserializeInstruction.js'

describe('deserializeInstruction / serializeInstruction', () => {
    const SYSTEM_PROGRAM = '11111111111111111111111111111111' as PublicKey
    const ACCOUNT_A = 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx' as PublicKey
    const ACCOUNT_B = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' as PublicKey

    it('roundtrips a simple instruction with no accounts and no data', () => {
        const ix: Instruction = {
            programId: SYSTEM_PROGRAM,
            keys: [],
            data: new Uint8Array(0),
        }

        const serialized = serializeInstruction(ix)
        const deserialized = deserializeInstruction(serialized)

        expect(deserialized.programId).to.equal(ix.programId)
        expect(deserialized.keys).to.deep.equal([])
        expect(deserialized.data).to.deep.equal(new Uint8Array(0))
    })

    it('roundtrips an instruction with accounts and data', () => {
        const ix: Instruction = {
            programId: SYSTEM_PROGRAM,
            keys: [
                { pubkey: ACCOUNT_A, isSigner: true, isWritable: true },
                { pubkey: ACCOUNT_B, isSigner: false, isWritable: true },
            ],
            data: new Uint8Array([2, 0, 0, 0, 0x40, 0x42, 0x0f, 0, 0, 0, 0, 0]),
        }

        const serialized = serializeInstruction(ix)
        const deserialized = deserializeInstruction(serialized)

        expect(deserialized.programId).to.equal(ix.programId)
        expect(deserialized.keys.length).to.equal(2)

        expect(deserialized.keys[0].pubkey).to.equal(ACCOUNT_A)
        expect(deserialized.keys[0].isSigner).to.equal(true)
        expect(deserialized.keys[0].isWritable).to.equal(true)

        expect(deserialized.keys[1].pubkey).to.equal(ACCOUNT_B)
        expect(deserialized.keys[1].isSigner).to.equal(false)
        expect(deserialized.keys[1].isWritable).to.equal(true)

        expect(deserialized.data).to.deep.equal(ix.data)
    })

    it('roundtrips an instruction with signer-only (non-writable) account', () => {
        const ix: Instruction = {
            programId: SYSTEM_PROGRAM,
            keys: [
                { pubkey: ACCOUNT_A, isSigner: true, isWritable: false },
            ],
            data: new Uint8Array([1, 2, 3]),
        }

        const serialized = serializeInstruction(ix)
        const deserialized = deserializeInstruction(serialized)

        expect(deserialized.keys[0].isSigner).to.equal(true)
        expect(deserialized.keys[0].isWritable).to.equal(false)
    })

    it('roundtrips an instruction with writable non-signer account', () => {
        const ix: Instruction = {
            programId: SYSTEM_PROGRAM,
            keys: [
                { pubkey: ACCOUNT_A, isSigner: false, isWritable: true },
            ],
            data: new Uint8Array([]),
        }

        const serialized = serializeInstruction(ix)
        const deserialized = deserializeInstruction(serialized)

        expect(deserialized.keys[0].isSigner).to.equal(false)
        expect(deserialized.keys[0].isWritable).to.equal(true)
    })

    it('throws on data that is too short', () => {
        const tooShort = Buffer.alloc(10).toString('base64')
        expect(() => deserializeInstruction(tooShort)).to.throw('Instruction data too short')
    })

    it('throws on truncated account data', () => {
        // Valid program ID (32 bytes) + 1 account count + incomplete account data
        const buffer = Buffer.alloc(34 + 10)
        buffer.writeUInt16LE(1, 32) // 1 account but not enough data for it
        const b64 = buffer.toString('base64')

        expect(() => deserializeInstruction(b64)).to.throw('Unexpected end of data')
    })
})
