# Changelog

All notable changes to this project will be documented in this file.

## [UNRELEASED]

### Fixed
- Wallet path handling in `config wallets set` and `config wallets add` commands
  - Added path normalization to store absolute paths instead of relative paths
  - Added validation to check if wallet file exists before setting it
  - Fixed issue where changing directories would cause "missing wallet file" errors
  - Improved error messages for better user feedback

### Changed
- Updated wallet path storage to use absolute paths consistently
- Enhanced error handling in wallet configuration commands
- Improved command index pages with better descriptions and examples
  - Added detailed descriptions for core commands (asset, collection, plugins)
  - Enhanced examples with more use cases and options
  - Improved help text formatting and organization
  - Added subcommand descriptions and available options

  ## [0.0.6]

  - Initial public beta release