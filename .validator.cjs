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
        label: 'MPL Core Candy Machine',
        programId: 'CMACYFENjoBMHzapRXyo1JZkVS6EtaDDzkjMrmQLvr4J',
        deployPath: './.amman/mpl_core_candy_machine.so',
      },
      {
        label: 'MPL Core Candy Guard',
        programId: 'CMAGAKJ67e9hRZgfC5SFTbZH8MgEmtqazKXjmkaJjWTJ',
        deployPath: './.amman/mpl_core_candy_guard.so',
      },
    ],
    commitment: 'processed',
  },
};
