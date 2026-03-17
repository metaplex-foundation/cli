import { Instruction, PublicKey } from '@metaplex-foundation/umi'
import { publicKey as publicKeySerializer } from '@metaplex-foundation/umi/serializers'

const pkSerializer = publicKeySerializer()

/**
 * Deserializes a base64-encoded Solana instruction.
 *
 * Format (compact binary):
 *   - 32 bytes: program ID
 *   - 2 bytes (u16 LE): number of accounts
 *   - For each account:
 *     - 32 bytes: pubkey
 *     - 1 byte: flags (bit 0 = isSigner, bit 1 = isWritable)
 *   - Remaining bytes: instruction data
 */
export function deserializeInstruction(base64: string): Instruction {
  const buffer = Buffer.from(base64, 'base64')
  let offset = 0

  if (buffer.length < 34) {
    throw new Error('Instruction data too short')
  }

  // Program ID (32 bytes)
  const [programId, nextOffset] = pkSerializer.deserialize(buffer, offset)
  offset = nextOffset

  // Number of accounts (u16 LE)
  const numAccounts = buffer.readUInt16LE(offset)
  offset += 2

  const keys: Instruction['keys'] = []
  for (let i = 0; i < numAccounts; i++) {
    if (offset + 33 > buffer.length) {
      throw new Error(`Unexpected end of data reading account ${i + 1}`)
    }

    const [pubkey, pubkeyEnd] = pkSerializer.deserialize(buffer, offset)
    offset = pubkeyEnd

    const flags = buffer[offset]
    offset += 1

    keys.push({
      pubkey: pubkey as PublicKey,
      isSigner: (flags & 0x01) !== 0,
      isWritable: (flags & 0x02) !== 0,
    })
  }

  // Remaining bytes are instruction data
  const data = new Uint8Array(buffer.subarray(offset))

  return {
    programId: programId as PublicKey,
    keys,
    data,
  }
}

/**
 * Serializes an instruction to base64, matching the format expected by deserializeInstruction.
 */
export function serializeInstruction(ix: Instruction): string {
  const accountsSize = ix.keys.length * 33
  const buffer = Buffer.alloc(32 + 2 + accountsSize + ix.data.length)
  let offset = 0

  // Program ID
  const programIdBytes = pkSerializer.serialize(ix.programId)
  Buffer.from(programIdBytes).copy(buffer, offset)
  offset += 32

  // Number of accounts
  buffer.writeUInt16LE(ix.keys.length, offset)
  offset += 2

  // Accounts
  for (const key of ix.keys) {
    const pubkeyBytes = pkSerializer.serialize(key.pubkey)
    Buffer.from(pubkeyBytes).copy(buffer, offset)
    offset += 32

    let flags = 0
    if (key.isSigner) flags |= 0x01
    if (key.isWritable) flags |= 0x02
    buffer[offset] = flags
    offset += 1
  }

  // Instruction data
  Buffer.from(ix.data).copy(buffer, offset)

  return buffer.toString('base64')
}
