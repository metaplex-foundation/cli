# Configuration Commands

The `config` commands allow you to manage your CLI configuration settings, including RPC endpoints, wallet settings, and explorer preferences. These settings determine how the CLI interacts with the Solana network and displays information.

## Command Structure

```bash
mplx config <command> [options]
```

## Available Commands

### General Configuration

```bash
# Get current configuration
mplx config get [options]
  --key <key>           # Get specific configuration value

# Set configuration values
mplx config set [options]
  --key <key>          # Configuration key to set
  --value <value>      # Value to set for the key
```

### Explorer Configuration

Commands for managing blockchain explorer settings:

```bash
# Set preferred explorer
mplx config explorer set [options]
  --explorer <name>     # Explorer name (solanaExplorer, solscan, solanaFm)

# Get current explorer settings
mplx config explorer get

# Available Explorers:
- solanaExplorer (explorer.solana.com)
- solscan (solscan.io)
- solanaFm (solana.fm)
```

### RPC Configuration

Commands for managing RPC endpoint settings:

```bash
# Set RPC endpoint
mplx config rpcs set [options]
  --url <url>          # RPC endpoint URL
  --cluster <cluster>  # Cluster name (mainnet, devnet, testnet)

# Get current RPC settings
mplx config rpcs get

# List available RPC endpoints
mplx config rpcs list
```

### Wallet Configuration

Commands for managing wallet settings:

```bash
# Set wallet configuration
mplx config wallets set [options]
  --path <path>        # Path to wallet keypair
  --type <type>       # Wallet type (keypair, ledger)

# Get current wallet settings
mplx config wallets get
```

## Configuration File

The CLI configuration is stored in a JSON file at `~/.config/mplx/config.json` with the following structure:

```json
{
  "explorer": {
    "name": "solanaExplorer",
    "cluster": "mainnet"
  },
  "rpc": {
    "url": "https://api.mainnet-beta.solana.com",
    "cluster": "mainnet"
  },
  "wallet": {
    "path": "~/.config/solana/id.json",
    "type": "keypair"
  }
}
```

## Environment Variables

Configuration can also be set using environment variables:

```bash
MPLX_RPC_URL           # Override RPC endpoint URL
MPLX_WALLET_PATH       # Override wallet path
MPLX_EXPLORER          # Override explorer preference
```

## Examples

```bash
# Set RPC endpoint to devnet
mplx config rpcs set --url https://api.devnet.solana.com --cluster devnet

# Set wallet to use Ledger
mplx config wallets set --type ledger

# Set explorer to Solscan
mplx config explorer set --explorer solscan

# Get current RPC configuration
mplx config rpcs get

# Get entire configuration
mplx config get
```

## Error Handling

- Invalid configuration values will be rejected with clear error messages
- Missing required values will prompt for input
- Configuration file permissions will be validated
- Network connectivity will be tested for RPC endpoints

## Best Practices

1. Always verify RPC endpoint reliability before setting
2. Keep wallet keypair files in secure locations
3. Use environment variables for temporary overrides
4. Regularly backup configuration files
5. Use appropriate explorers for different clusters

## Security Considerations

1. Never share your wallet keypair file
2. Verify RPC endpoints are from trusted sources
3. Use HTTPS endpoints when possible
4. Consider using hardware wallets for additional security
5. Regularly audit configuration settings

## Additional Resources

- [Solana CLI Configuration](https://docs.solana.com/cli/choose-a-cluster)
- [RPC API Documentation](https://docs.solana.com/developing/clients/jsonrpc-api)
- [Wallet Guide](https://docs.solana.com/wallet-guide)
