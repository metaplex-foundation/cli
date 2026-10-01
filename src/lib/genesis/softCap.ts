/**
 * Shared soft cap helpers for Genesis launch pools.
 *
 * A soft cap is a ceiling on the quote tokens a launch pool keeps. Deposits above
 * it are still accepted and the launch still succeeds, but the excess is refunded
 * pro-rata via RefundLaunchPoolV2.
 */

/**
 * Validates a soft cap against the program's two configuration rules, so callers
 * fail before sending rather than decoding InvalidSoftCap (221) or
 * SoftCapBelowThreshold (222) from the program.
 *
 * @param softCap Raw soft cap flag value, or undefined when unset.
 * @param minimumQuoteTokenThreshold Raw threshold flag value, or undefined when unset.
 * @throws Error when the soft cap is zero, or below the configured threshold.
 */
export function validateSoftCap(
  softCap: string | undefined,
  minimumQuoteTokenThreshold: string | undefined
): void {
  if (softCap === undefined) return

  const cap = BigInt(softCap)
  if (cap <= 0n) {
    throw new Error(
      '"softCap" must be greater than zero. Omit the flag instead of passing 0 to leave the launch uncapped'
    )
  }

  if (minimumQuoteTokenThreshold !== undefined) {
    const threshold = BigInt(minimumQuoteTokenThreshold)
    if (cap < threshold) {
      throw new Error(
        `"softCap" (${cap}) must be greater than or equal to "minimumQuoteTokenThreshold" (${threshold})`
      )
    }
  }
}

/**
 * Computes the refundable excess of a single deposit in an oversubscribed pool.
 *
 * Mirrors the program's math: the filled portion rounds up so the sum of all
 * filled portions is at least the soft cap, keeping the bucket solvent. The
 * excess therefore rounds down.
 *
 * @param depositAmount The depositor's credited quote token amount.
 * @param softCap The configured soft cap amount.
 * @param totalDeposits The bucket's aggregate quote token deposit total.
 * @returns The refundable excess in quote token quantum units.
 * @throws Error when totalDeposits is zero.
 */
export function computeExcessRefund(
  depositAmount: bigint,
  softCap: bigint,
  totalDeposits: bigint
): bigint {
  if (totalDeposits === 0n) {
    throw new Error('Cannot compute an excess refund against a zero deposit total')
  }

  const filled = ceilDiv(depositAmount * softCap, totalDeposits)
  const excess = depositAmount - filled
  return excess > 0n ? excess : 0n
}

/**
 * Integer division rounding up, matching the program's div_ceil.
 *
 * @param numerator The dividend.
 * @param denominator The divisor, which must be non-zero.
 * @returns The quotient rounded up.
 */
function ceilDiv(numerator: bigint, denominator: bigint): bigint {
  return (numerator + denominator - 1n) / denominator
}
