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
    ],
    commitment: 'processed',
  },
};
