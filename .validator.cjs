module.exports = {
  validator: {
    killRunningValidators: true,
    programs: [
      {
        label: 'MPL Token Metadata Program',
        programId: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
        deployPath: './.amman/mpl_token_metadata.so',
      },
      {
        label: 'MPL Core',
        programId: 'CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d',
        deployPath: './.amman/mpl_core.so',
      },
      {
        label: 'MPL Distro',
        programId: 'D1STRoZTUiEa6r8TLg2aAbG4nSRT5cDBmgG7jDqCZvU8',
        deployPath: './.amman/mpl_distro.so',
      },
      {
        label: 'MPL Core Candy Machine',
        programId: 'CMACYFENjoBMHzapRXyo1JZkVS6EtaDDzkjMrmQLvr4J',
        deployPath: './.amman/mpl_core_candy_machine.so',
      },
      {
        label: 'MPL Core Candy Guard',
        programId: 'CMAGAKJ67e9hRZgfC5SFTbZH8MgEmtqazKXjmkaJjWTJ',
        deployPath: './.amman/mpl_core_candy_guard.so',
      },
      {
        label: 'MPL Bubblegum',
        programId: 'BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY',
        deployPath: './.amman/mpl_bubblegum.so',
      },
      {
        label: 'SPL Noop',
        programId: 'noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV',
        deployPath: './.amman/spl_noop.so',
      },
      {
        label: 'Mpl Noop',
        programId: 'mnoopTCrg4p8ry25e4bcWA9XZjbNjMTfgYVGGEdRsf3',
        deployPath: './.amman/mpl_noop.so',
      },
      {
        label: 'Mpl Account Compression',
        programId: 'mcmt6YrQEMKw8Mw43FmpRLmf7BqRnFMKmAcbxE3xkAW',
        deployPath: './.amman/mpl_account_compression.so',
      },
      {
        label: 'SPL Account Compression',
        programId: 'cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK',
        deployPath: './.amman/spl_account_compression.so',
      },
    ],
    commitment: 'processed',
  },
};
