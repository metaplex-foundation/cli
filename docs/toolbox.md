# Toolbox Commands

The `toolbox` commands provide utility functions for common Solana blockchain operations, including SOL management, token operations, file uploads, and rent calculations.

## Command Structure

```bash
mplx toolbox <command> <subcommand> [options]
```

## Available Commands

### SOL Commands

Commands for managing SOL tokens:

```bash
# Airdrop SOL (devnet/testnet only)
mplx toolbox sol airdrop <amount> [options]
  <amount>            # Amount of SOL to airdrop
  --to <address>      # Recipient address (defaults to configured wallet)

# Transfer SOL
mplx toolbox sol transfer <amount> <recipient> [options]
  <amount>           # Amount of SOL to transfer
  <recipient>        # Recipient's address
  --from <keypair>   # Source keypair (optional)
```

### Token Commands

Commands for managing SPL tokens:

```bash
# Create a new token
mplx toolbox token create [options]
  --wizard           # Use interactive wizard mode
  --name <name>      # Token name
  --symbol <symbol>  # Token symbol
  --decimals <num>   # Number of decimals
  --image <path>     # Token image file
  --mint <amount>    # Initial mint amount
  --description <text> # Token description

# Transfer tokens
mplx toolbox token transfer <amount> <recipient> [options]
  <amount>          # Amount of tokens to transfer
  <recipient>       # Recipient's address
  --mint <address>  # Token mint address
```

### Upload Commands

Commands for uploading files to decentralized storage:

```bash
# Upload a file
mplx toolbox upload file <path> [options]
  <path>            # Path to file
  --storage <type>  # Storage type (arweave, irys, nft.storage)

# Upload JSON
mplx toolbox upload json <path> [options]
  <path>           # Path to JSON file
  --storage <type> # Storage type (arweave, irys, nft.storage)
```

### Rent Commands

Commands for calculating and managing rent:

```bash
# Calculate rent exemption
mplx toolbox rent calculate [options]
  --bytes <size>    # Account size in bytes
  --years <num>     # Number of years (for rent calculation)
```

## Storage Options

The toolbox supports multiple storage providers for file uploads:

```bash
# Available Storage Providers:
- Arweave (default)
- Irys (formerly Bundlr)
- NFT.storage
```

## Examples

```bash
# Airdrop 1 SOL on devnet
mplx toolbox sol airdrop 1

# Create a new token with wizard
mplx toolbox token create --wizard

# Create a token with specific parameters
mplx toolbox token create \
  --name "My Token" \
  --symbol "MTK" \
  --decimals 9 \
  --image ./token-logo.png \
  --mint 1000000000

# Upload an image file
mplx toolbox upload file ./image.png

# Calculate rent for 1KB account
mplx toolbox rent calculate --bytes 1024
```

## File Upload Specifications

### Supported File Types

```
Images: PNG, JPG, GIF, SVG
Documents: PDF, TXT, JSON
Media: MP3, MP4, WAV
Maximum file size: 100MB
```

### Upload Response Format

```json
{
  "uri": "https://arweave.net/...",
  "signature": "...",
  "mimeType": "image/png",
  "size": 1234
}
```

## Error Handling

- Network errors will be retried automatically
- Large file uploads will show progress bars
- Failed uploads will provide detailed error messages
- Token operations will validate addresses and amounts

## Best Practices

1. Always verify recipient addresses before transfers
2. Test token operations with small amounts first
3. Keep track of uploaded file URIs
4. Use appropriate storage providers based on needs
5. Monitor SOL balance for upload costs

## Cost Considerations

1. File upload costs vary by storage provider
2. SOL is required for rent and transaction fees
3. Token creation requires rent-exempt SOL
4. Consider using devnet for testing

## Additional Resources

- [Solana Token Program](https://spl.solana.com/token)
- [Arweave Documentation](https://docs.arweave.org)
- [Irys Documentation](https://docs.irys.xyz)
- [NFT.storage Documentation](https://nft.storage/docs/)
