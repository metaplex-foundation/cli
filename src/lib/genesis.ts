// Shared Genesis constants

// Key types from Genesis (enum values)
export const KEY_TYPES: Record<number, string> = {
  0: 'Uninitialized',
  1: 'GenesisAccount',
  2: 'LaunchPoolBucket',
  3: 'LaunchPoolDeposit',
  4: 'StreamflowBucket',
  5: 'UnlockedBucket',
  6: 'MeteoraBucket',
  7: 'PumpBucket',
  8: 'DistributionBucket',
  9: 'PresaleBucket',
  10: 'PresaleDeposit',
  11: 'VaultBucket',
  12: 'VaultDeposit',
  13: 'BondingCurveBucket',
  14: 'AuctionBucket',
  15: 'AuctionBid',
  16: 'AuctionTree',
  17: 'RaydiumCpmmBucket',
  18: 'GenesisAccountV2',
  19: 'PresaleBucketV2',
  20: 'PresaleDepositV2',
  21: 'UnlockedBucketV2',
  22: 'RaydiumCpmmBucketV2',
  23: 'VaultBucketV2',
  24: 'VaultDepositV2',
  25: 'BondingCurveBucketV2',
  26: 'LaunchPoolBucketV2',
  27: 'LaunchPoolDepositV2',
}

// Funding modes
export const FUNDING_MODES: Record<number, string> = {
  0: 'NewMint',
  1: 'Transfer',
  2: 'ExistingMint',
}
