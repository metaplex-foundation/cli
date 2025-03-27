# Configuration Commands

The `config` commands allow you to manage your CLI configuration settings, including RPC endpoints, wallet settings, and explorer preferences. These settings determine how the CLI interacts with the Solana network and displays information.

## Command Structure

```bash
mplx config <object> <command> [options]
```

## Available Commands

### General Configuration

```bash
# View current configuration
mplx config
```

### RPC Management

```bash
# Add a new RPC endpoint
mplx config rpcs add <name> <url>
  Example: mplx config rpcs add helius https://devnet.helius-rpc.com/?api-key=<key>

# List all configured RPCs
mplx config rpcs list

# Set active RPC (interactive)
mplx config rpcs set
  # Opens interactive prompt to select from available RPCs

# Set RPC directly
mplx config rpcs set --url <url>
```

### Wallet Management

```bash
# Add/Set a new wallet
mplx config wallets set <name> <path>
  Example: mplx config wallets set dev1 ~/.config/solana/dev1.json

# List all configured wallets
mplx config wallets list

# Set active wallet (interactive)
mplx config wallets set
  # Opens interactive prompt to select from available wallets

# Set wallet directly
mplx config wallets set --path <path>
```

### Explorer Configuration

```bash
# Set preferred explorer
mplx config explorer set <explorer>
  Supported: solscan, solanaFm, solanaExplorer

# View current explorer setting
mplx config explorer get
```

## Configuration File

The CLI configuration is stored in `~/.config/mplx/config.json` with the following structure:

```json
{
  "keypair": "/home/user/.config/solana/dev1.json",
  "rpcUrl": "https://api.devnet.solana.com",
  "explorer": "solscan",
  "wallets": {
    "default": "dev1",
    "dev1": "/home/user/.config/solana/dev1.json",
    "dev2": "/home/user/.config/solana/dev2.json"
  },
  "rpcs": {
    "helius": "https://devnet.helius-rpc.com/?api-key=<key>",
    "quicknode": "https://api.devnet.solana.com"
  }
}
```

## Interactive Features

The CLI provides wizard-based configuration for easier setup:

### RPC Selection
```bash
$ mplx config rpcs set

? Select an RPC (Use arrow keys)
❯ helius     https://devnet.helius-rpc.com/?api-key=<key>
  quicknode  https://api.devnet.solana.com
```

### Wallet Selection
```bash
$ mplx config wallets set

? Select a wallet (Use arrow keys)
❯ dev1    FZp4xyJxaJT3EtMHLxLF1QEKVqrqT5okPwt1F9ZK6TGf
  dev2    BKWPSxcQZ1RxQZdEpVfycwsQQpdGwZdx5SJYZHGqE7s5
```

## Best Practices

1. Use descriptive names for RPCs and wallets
2. Keep sensitive information (API keys, keypairs) secure
3. Regularly verify RPC endpoint connectivity
4. Use different wallets for development and production
5. Back up your configuration file

## Error Handling

The CLI provides clear error messages for common issues:
- Invalid file paths
- Unreachable RPC endpoints
- Missing configuration files
- Invalid wallet formats
- Permission issues

