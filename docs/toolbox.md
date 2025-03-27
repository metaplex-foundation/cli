# Toolbox Commands

The `toolbox` commands provide utility functions for common Solana blockchain operations, including SOL management and token operations.

## Command Structure

```bash
mplx toolbox <object> <command> [options]
```

## Available Commands

### SOL Commands

```bash
# Check SOL balance
mplx toolbox sol balance [address]
  # If no address provided, checks configured wallet's balance

# Transfer SOL
mplx toolbox sol transfer <amount> <recipient>
  Example: mplx toolbox sol transfer 1 AKQwGqAhAYHXpNELLVhkf8fNXxEGzWxAF2UGjHqXbspw
```

### Token Commands

```bash
# Create a new token
mplx toolbox token create [options]
  --wizard           # Use interactive wizard mode
  --name <name>      # Token name
  --symbol <symbol>  # Token symbol
  --decimals <num>   # Number of decimals
  --image <path>     # Token image file
  --mint <amount>    # Initial mint amount

# Update token metadata
mplx toolbox token update <mint> [options]
  --name <name>      # New token name
  --symbol <symbol>  # New token symbol
  --image <path>     # New token image
  --description <text> # New description

# Transfer tokens
mplx toolbox token transfer <mint> <amount> <recipient>
  Example: mplx toolbox token transfer TokenMint123... 100 Recipient456...
```

## Interactive Features

### Token Creation Wizard
```bash
$ mplx toolbox token create --wizard

? Enter token name: My Token
? Enter token symbol: MTK
? Enter number of decimals: 9
? Select image file: ./logo.png
? Enter initial mint amount: 1000000000

Creating token...
✓ Token created successfully!
Mint: 7KVswz8sCfXy2giGdnkqePccPJSDQZCnhHUrfKvGYt9L
```

## Examples

### Token Operations
```bash
# Create token with specific parameters
mplx toolbox token create \
  --name "My Token" \
  --symbol "MTK" \
  --decimals 9 \
  --image ./token-logo.png \
  --mint 1000000000

# Update token metadata
mplx toolbox token update <mint> \
  --name "Updated Token Name" \
  --image ./new-logo.png

# Check SOL balance
mplx toolbox sol balance
```

## Best Practices

1. Always verify addresses and amounts before transfers
2. Test operations on devnet first
3. Keep track of mint addresses
4. Back up token metadata
5. Double-check recipient addresses before transfers

## Error Handling

The CLI provides clear error messages for common issues:
- Insufficient balance for transfers
- Invalid mint addresses
- Invalid wallet addresses
- Network connectivity issues
- Transaction failures

## Additional Resources

- [Metaplex Documentation](https://docs.metaplex.com)
- [Solana Documentation](https://docs.solana.com)
- [Discord Support](https://discord.gg/metaplex)
