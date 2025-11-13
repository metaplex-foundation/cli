# Metaplex CLI

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/cli.svg)](https://npmjs.org/package/cli)
[![Downloads/week](https://img.shields.io/npm/dw/cli.svg)](https://npmjs.org/package/cli)

A powerful command-line interface for interacting with the Metaplex ecosystem on Solana. This CLI provides tools for managing digital assets, collections, tokens, candy machines, and more.

## Beta Notes
This CLI and software is in beta and public testing. There may be bugs and functionality/commands may change on a daily basis as updates are implemented and pushed. Documentation might also be incomplete at times.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Candy Machine Quick Start](#candy-machine-quick-start)
- [Command Structure](#command-structure)
- [Documentation](#documentation)

## Installation

### NPM Installation
```sh
npm install -g @metaplex-foundation/cli
```

### Development Installation
```sh
git clone https://github.com/metaplex-foundation/cli.git
cd cli
npm install
npm run build
npm run mplx
```

When running the development installation, you can use the `npm run mplx <command>` command to start the CLI.

## Quick Start

This CLI is designed to be used with multiple RPCs and wallets. Here's how to get started:

### 1. Configure Your Environment

#### RPC Configuration
```sh
# Add a new RPC
mplx config rpcs add rpc1 https://my-custom-rpc.com/rpc

# List all RPCs
mplx config rpcs list

# Switch active RPC
mplx config rpcs set

? Select an RPC (Use arrow keys)
❯ rpc1                 https://my-custom-rpc.com/rpc123456789
  rpc2                 https://my-custom-rpc.com/rpc987654321
```

#### Wallet Configuration
```sh
# Add a new wallet
mplx config wallets add wallet1 ./path/to/keypair.json

# List all wallets
mplx config wallets list

# Switch active wallet
mplx config wallets set

? Select a wallet: (Use arrow keys)
❯ wallet1    address...
  wallet2    address...
```

### 2. Create Your First Assets

#### Create a Collection
```sh
# Create with metadata URI
mplx core collection create --name "My Collection" --uri "https://example.com/collection-metadata.json"

# Or create with local files
mplx core collection create --files --image ./image.png --json ./collection-metadata.json

# Generate template files
mplx core collection template
```

#### Create an Asset
```sh
# Create with metadata URI
mplx core asset create --name "My Asset" --uri "https://example.com/metadata.json"

# Or create with local files
mplx core asset create --files --image ./image.png --json ./metadata.json

# Generate template files
mplx core asset template
```

#### Create a Token
```sh
# Interactive token creation
mplx toolbox token create --wizard

# Or create with specific parameters
mplx toolbox token create \
  --name "My Token" \
  --symbol "TOKEN" \
  --decimals 9 \
  --image ./token-logo.png \
  --mint 1000000000
```

## Candy Machine Quick Start

The CLI now features a powerful, user-friendly Candy Machine wizard for creating and managing NFT drops:

```sh
mplx cm create --wizard
```

**Wizard Highlights:**
- Guided prompts for directory, assets, collection, guards, and groups
- Automatic asset discovery and validation with actionable error messages
- Progress indicators for uploads, creation, and insertion
- File overwrite protection and abort support at every step
- Smart asset cache reuse and reload options
- Detailed completion summary with next steps

**Example Output:**
```
--------------------------------
    Welcome to the Candy Machine Creator Wizard!
    This wizard will guide you through the process of creating a new candy machine.                
--------------------------------
✔ Directory name for your Candy Machine project? candy1
✔ Directory "candy1" already exists and contains 3 files. Type 'y' to use, 'n' to abort, or 'q' to quit: y
✔ Move your assets to the assets folder and press enter to continue, or type q to abort 
📁 Asset Discovery:
✔ Found 100 JSON files
✔ Found 100 image files
✔ Found collection metadata
✔ Found collection image
✔ Should the NFTs be mutable? (y/n or q to quit) y
✔ Do you want to create global guards? (y/n or q to quit) n
✔ Do you want to create guard groups for minting? (y/n or q to quit) n
⚠️  Warning: You have not set any global guards or guard groups. This may result in a non-functional candy machine. Consider adding at least one guard or group.

Configuration saved to: /path/to/candy1/cm-config.json
📁 Using existing asset cache (100 items already uploaded)
✔ Upload validation completed
✔ Collection image uploaded
✔ Collection metadata uploaded
✔ Collection created
⠦ Creating candy machine
Tx confirmed
✔ Candy machine created - HVgv54E36CRxGZoq9TCWafTV6WA1tMX33rNXrBX3wW9
✔ Sent 13 transactions
✔ Confirmed 13 transactions

🎉 Wizard complete! Here is a summary of your setup:
- Directory: candy1
- Assets: 100 JSON, 100 images, 0 animations
- Collection: Collection
- Collection ID: 5hJkVr6ETbPdtxmv8LfcUt1eumvSuWVZPRqqNS6byNYh
🎉 Candy machine created successfully!
```

For advanced usage, see the [Candy Machine Documentation](docs/candyMachine/index.md).

## Command Structure

Commands follow the format: `mplx <program> <object> <command> [flags]`

Example:
```sh
mplx core asset create --name "Asset Name" --uri "metadata.json"
```

Get help for any command:
```sh
mplx [COMMAND] --help
```

## Documentation

The CLI is organized into four main command groups:

- [Core Commands](docs/core.md)
  - Asset management (create, update, burn)
  - Collection management
  - Plugin system

- [Candy Machine Commands](docs/candyMachine/index.md)
  - Create, upload, insert, and manage candy machines
  - Guard and group configuration
  - Wizard and manual workflows

- [Configuration Commands](docs/config.md)
  - RPC management
  - Wallet management
  - Explorer preferences

- [Toolbox Commands](docs/toolbox.md)
  - SOL operations
  - Token management
  - Rent calculations

Each command group has detailed documentation with examples and best practices.
