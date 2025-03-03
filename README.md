# Metaplex CLI

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/cli.svg)](https://npmjs.org/package/cli)
[![Downloads/week](https://img.shields.io/npm/dw/cli.svg)](https://npmjs.org/package/cli)

A powerful command-line interface for interacting with the Metaplex ecosystem on Solana. This CLI provides tools for managing digital assets, collections, tokens, and more.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Command Structure](#command-structure)
- [Documentation](#documentation)
- [Development](#development)
- [Contributing](#contributing)

## Installation

### NPM Installation (Coming Soon)
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

This CLI is designed to be used with multiple RPCs and wallets. You can add and manage multiple RPCs and wallets.

1. RPC Configuration:
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

2. Manage Multiple Wallets:
```sh
# Add a new wallet
mplx config wallets set wallet1 ./path/to/keypair.json

# List all wallets
mplx config wallets list

# Switch active wallet
mplx config wallets set

? Select a wallet: (Use arrow keys)
❯ wallet1    address...
  wallet2    address...
```

3. Create your first token:
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

4. Create your first Core asset:
```sh
# Create an asset
mplx core asset create --name "My Asset" --uri "https://example.com/metadata.json"

# Or create with files
mplx core asset create --files --image ./image.png --json ./metadata.json
```

5. View help for any command:
```sh
mplx help [COMMAND]
```

## Command Structure

Commands follow the format: `mplx <program> <object> <command> [flags]`

Example:
```sh
mplx core asset create --name "Asset Name" --uri "metadata.json"
```

## Documentation

The CLI is organized into several main command groups:

- [Core Commands](docs/core.md)
  - Asset management
  - Collection management
  - Plugin system

- [Configuration Commands](docs/config.md)
  - RPC settings
  - Wallet management
  - Explorer preferences

- [Toolbox Commands](docs/toolbox.md)
  - SOL operations
  - Token management
  - File uploads
  - Rent calculations

Each command group has detailed documentation with examples and best practices.

## Common Commands

### Asset Management
```sh
# Create an asset
mplx core asset create --name "Asset" --uri "metadata.json"

# Burn an asset
mplx core asset burn <assetId>
```

### Token Operations
```sh
# Create a token
mplx toolbox token create --wizard

# Upload files
mplx toolbox upload file ./image.png
```

### Configuration
```sh
# View config
mplx config get

# Interactive RPC Configuration
mplx config rpcs set --wizard
# This will guide you through:
# 1. Selecting a cluster (mainnet, devnet, testnet)
# 2. Choosing from preset RPCs or entering a custom URL
# 3. Testing the connection
# 4. Saving the configuration

# Manual RPC Configuration
mplx config rpcs set --url https://api.devnet.solana.com

# Interactive Wallet Configuration
mplx config wallets set --wizard
# This will guide you through:
# 1. Selecting wallet type (keypair file, ledger)
# 2. Setting up wallet path or ledger options
# 3. Verifying wallet access
# 4. Setting as default wallet

# Manual Wallet Configuration
mplx config wallets set --path /path/to/keypair.json

# Interactive Explorer Configuration
mplx config explorer set --wizard
# This will guide you through:
# 1. Selecting preferred explorer
# 2. Setting default view options
```

### Interactive Configuration Tips

The CLI provides wizard-based configuration for easier setup:

#### Add and Manage Multiple RPCs
```sh
$ mplx config rpcs add rpc1 https://my-custom-rpc.com/rpc
```

Set the active RPC
```sh
$ mplx config rpcs set

? Select an RPC (Use arrow keys)
❯ rpc1                 https://my-custom-rpc.com/rpc123456789
  rpc2                 https://my-custom-rpc.com/rpc987654321
```

List all RPCs
```sh
$ mplx config rpcs list

Installed RPCs:
rpc1: https://my-custom-rpc.com/rpc123456789
rpc2: https://my-custom-rpc.com/rpc987654321
```

#### Add and Manage Mutiple Wallets
Add a new wallet
```sh
$ mplx config wallets set wallet1 ./path/to/keypair.json
```

List all wallets
```sh
$ mplx config wallets list

Installed Wallets:
wallet1: /path/to/keypair.json
wallet2: /path/to/keypair2.json
```

Set the active wallet
```sh
$ mplx config wallets set

? Select a wallet: (Use arrow keys)
❯ wallet1    address...
  wallet2    address...
```



The wizards provide:
- Step-by-step guidance
- Validation of inputs
- Connection testing
- Default value suggestions
- Automatic configuration saving

## License

Metaplex License

## Additional Resources

- [Metaplex Documentation](https://docs.metaplex.com)
- [Solana Documentation](https://docs.solana.com)
- [Discord Community](https://discord.gg/metaplex)
