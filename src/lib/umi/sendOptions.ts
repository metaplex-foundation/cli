import {Commitment} from '@metaplex-foundation/umi'

export interface UmiSendOptions {
  priorityFee?: number | undefined
  commitment?: Commitment | undefined
  skipPreflight?: boolean | undefined
}

export interface UmiSendAllOptions extends UmiSendOptions {
  batchSize?: number
}
