# Changelog

All notable changes to the Metaplex CLI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - Core Candy Machine Implementation

### Added
- **Candy Machine Commands**: New `cm` command group for creating and managing MPL Core Candy Machines
  - `mplx cm create` - Create candy machines with multiple modes:
    - `--wizard` - Interactive wizard for guided candy machine creation
    - `--template` - Generate candy machine template directory
    - Direct creation from existing configuration
  - `mplx cm upload` - Upload candy machine assets to decentralized storage
  - `mplx cm insert` - Insert items into existing candy machines
  - `mplx cm validate` - Validate asset cache and uploads
- **Template Commands**: New `toolbox template` commands for downloading project templates
  - `mplx toolbox template program` - Download Solana program templates (Shank)
  - `mplx toolbox template website` - Download website templates (Next.js with Tailwind/ShadCN)

### Enhanced
- **Interactive Wizard**: Comprehensive candy machine creation wizard with:
  - Asset discovery and validation
  - Collection configuration (create new or use existing)
  - Guard and group setup for minting rules
  - Progress tracking for uploads and transactions
  - Detailed completion summary
- **Asset Management**: Improved asset handling with:
  - Batch upload support for images and metadata
  - Asset cache management for efficient re-uploads
  - Validation of asset integrity and completeness
- **Configuration System**: Enhanced candy machine configuration with:
  - JSON-based configuration files (`cm-config.json`)
  - Guard configuration support (SOL payments, allowlists, etc.)
  - Group-based minting phases
  - Collection integration

### Technical Improvements
- **Transaction Handling**: Improved transaction building and confirmation for candy machine operations
- **Error Handling**: Enhanced error messages and validation throughout candy machine workflow
- **Testing**: Comprehensive test suite for candy machine functionality including:
  - Unit tests for candy machine creation
  - Integration tests for full lifecycle (create, upload, insert)
  - Test helpers for common operations

### Documentation
- **Candy Machine Guide**: Complete documentation covering:
  - Directory structure and asset organization
  - Wizard and manual workflow options
  - Guard and group configuration examples
  - Best practices and troubleshooting
- **Template System**: Quick-start templates for Solana development:
  - Program templates for building on-chain logic
  - Website templates for frontend development

### Dependencies
- Updated to `@metaplex-foundation/mpl-core-candy-machine` v0.3.0
- Enhanced UMI integration for candy machine operations
- Improved file upload handling with progress indicators

---

## [0.0.6] - 2024-01-XX

### Added
- Initial CLI structure and core functionality
- Asset and collection management commands
- Toolbox commands for SOL and token operations
- Configuration management system
- Interactive wizards for various operations

### Changed
- Refactored command structure for better organization
- Improved error handling and user feedback
- Enhanced documentation and examples

### Fixed
- Various bug fixes and typo corrections
- Improved RPC chain detection and explorer URL generation 