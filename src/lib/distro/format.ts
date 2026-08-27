import { type PublicKey, publicKey } from '@metaplex-foundation/umi'

/**
 * `findDistributionPda` returns a Umi Pda, which stringifies as `address,bump`.
 * Later commands need the base58 address only.
 */
export const distributionAddressFromPda = (
  pda: PublicKey | readonly [PublicKey, number] | Uint8Array,
): PublicKey => publicKey(Array.isArray(pda) ? pda[0] : pda)

export const decodeDistributionName = (
  name: Uint8Array | number[] | string | Record<string, number>,
): string => {
  if (typeof name === 'string') {
    return name.replace(/\0+$/, '')
  }

  const bytes = name instanceof Uint8Array
    ? name
    : Uint8Array.from(Array.isArray(name) ? name : Object.values(name))
  const end = bytes.indexOf(0)

  return new TextDecoder().decode(end === -1 ? bytes : bytes.subarray(0, end))
}

export const formatTokenAmount = (basisAmount: bigint | number, decimals: number): string => {
  const basis = BigInt(basisAmount)
  const divisor = 10n ** BigInt(decimals)
  const whole = basis / divisor
  const frac = basis % divisor
  if (frac === 0n) {
    return whole.toString()
  }

  return `${whole}.${frac.toString().padStart(decimals, '0').replace(/0+$/, '')}`
}
