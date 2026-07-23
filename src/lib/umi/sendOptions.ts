import {Commitment} from '@metaplex-foundation/umi'

export enum ConfirmationStrategy {
  blockhash = 'blockhash',
  transactionStatus = 'transactionStatus',
}

export interface UmiSendOptions {
  priorityFee?: number | undefined
  /** Override the default compute unit limit (400_000). */
  computeUnitLimit?: number | undefined
  commitment?: Commitment | undefined
  skipPreflight?: boolean | undefined
  confirmationStrategy?: ConfirmationStrategy
}

export interface UmiSendAllOptions extends UmiSendOptions {
  batchSize?: number
  message?: string
  onSendStart?: () => void
  onSendProgress?: () => void
  onConfirmProgress?: () => void
}
