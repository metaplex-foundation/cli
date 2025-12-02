# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the Metaplex CLI (`mplx`), a command-line interface for interacting with the Metaplex ecosystem on Solana. It provides tools for managing digital assets, collections, tokens, and more using the Metaplex Core protocol.

## Development Commands

### Building and Development
```bash
# Build the project
npm run build

# Clean build artifacts
npm run clean

# Clean and rebuild
npm run build:clean

# Development mode (uses ts-node)
./bin/dev.js

# Run built CLI
./bin/run.js
# or
npm run mplx
```

### Code Quality
```bash
# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Type checking and build verification
npm run verify
```

### Testing
```bash
# Run all tests
npm test

# Start local validator for testing
npm run validator

# Stop local validator
npm run validator:stop
```

## Architecture Overview

### Command Structure
The CLI follows the OCLIF framework with a hierarchical command structure:
- `mplx <program> <object> <command> [flags]`
- Three main command groups: `core`, `config`, `toolbox`

### Core Components

**Base Classes:**
- `BaseCommand` (src/BaseCommand.ts): Base class for non-transactional commands with global flags
- `TransactionCommand` (src/TransactionCommand.ts): Extended base class for blockchain transaction commands with commitment levels

**Context System:**
- `Context` (src/lib/Context.ts): Central configuration management for RPC, wallets, signers, and Umi instance
- Configuration stored in `~/.config/mplx/config.json`
- Supports multiple RPCs and wallets with switching capabilities

**Key Libraries:**
- Uses Metaplex Umi as the core blockchain interaction layer
- Integrates mpl-core, mpl-token-metadata, and mpl-toolbox programs
- File-based and Ledger wallet support through custom signer implementations

### Command Groups

**Core Commands** (`src/commands/core/`):
- Asset management (create, burn, fetch, update)
- Collection management (create, fetch)
- Plugin system (add, generate)

**Config Commands** (`src/commands/config/`):
- RPC endpoint management (add, list, set, remove)
- Wallet management (add, list, set, remove, new)
- Explorer preferences

**Toolbox Commands** (`src/commands/toolbox/`):
- SOL operations (balance, transfer, airdrop)
- Token operations (create, transfer, update)
- Utility functions (rent calculations)

### File Upload System
- Pluggable storage providers (Irys, Arweave Turbo)
- Automatic file type detection and MIME type handling
- Support for batch operations with directory structures

### Testing Framework
- Mocha-based test suite
- Helper functions for creating test assets and collections
- Integration with Amman for local validator testing
- Test utilities in `test/corehelpers.ts` for extracting IDs from CLI output

## Development Guidelines

### Adding New Commands
1. Extend appropriate base class (BaseCommand or TransactionCommand)
2. Follow existing patterns for flag definitions and help text
3. Use the context system for blockchain interactions
4. Include proper error handling and user feedback

### Working with Umi
- Access Umi instance through `this.context.umi`
- Use context signers for transactions: `this.context.signer`, `this.context.payer`
- Leverage existing transaction utilities in `src/lib/umi/`

### File Operations
- Use utilities in `src/lib/file.ts` for file handling
- Leverage storage providers in `src/lib/uploader/` for uploads
- Follow existing patterns for metadata and plugin file structures

### Configuration Management
- Extend ConfigJson type for new configuration options
- Update CONFIG_KEYS array when adding new config fields
- Use consolidateConfigs function for merging configuration sources

## Package Management
- Uses pnpm as package manager
- Node.js >= 20.0.0 required
- ESM modules with TypeScript compilation target es2022