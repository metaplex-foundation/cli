# Token Metadata Commands

The `tm` commands provide functionality for creating and managing NFTs using the MPL Token Metadata program. These commands allow you to create both regular NFTs and Programmable NFTs (pNFTs) with comprehensive metadata, royalty, and collection support.

## Command Structure

```bash
mplx tm <command> [options]
```

## Available Commands

### NFT Creation

Commands for creating NFTs:

```bash
# Create an NFT using interactive wizard
mplx tm create --wizard

# Create NFT with existing metadata URI
mplx tm create --name "My NFT" --uri "https://example.com/metadata.json"

# Create NFT from files
mplx tm create --image "./nft.png" --json "./metadata.json"

# Create NFT with manual metadata
mplx tm create --name "My NFT" --image "./nft.png" --attributes "trait1:value1,trait2:value2"
```

## Key Features

### NFT Types

- **Regular NFTs**: Traditional non-fungible tokens with marketplace-dependent royalty compliance
- **Programmable NFTs (pNFTs)**: Advanced NFTs with programmable royalty enforcement and transfer controls

### Creation Methods

Programmable NFTs (pNFTs) are created by default unless you specify `--pnft false` to create regular NFTs.

1. **Interactive Wizard**: Guided step-by-step creation process
2. **File-based**: Upload image and JSON metadata files
3. **URI-based**: Use existing online metadata
4. **Manual**: Build metadata from command-line flags

### Metadata Support

- **Basic Info**: Name, description, project URL
- **Media Files**: Images, videos, audio, 3D models
- **Attributes**: Trait/value pairs for NFT properties
- **Collections**: Group related NFTs together
- **Royalties**: Creator royalty percentages with enforcement options

## Common Options

Token Metadata commands support standard CLI options:

```bash
--commitment <level>  # Transaction commitment level
--rpc <url>          # Custom RPC endpoint
--keypair <path>     # Path to keypair file
--config <path>      # Configuration file path
--log-level <level>  # Logging level
```

## Examples

```bash
# Quick NFT creation with wizard
mplx tm create --wizard

# Create collection NFT with high royalties
mplx tm create \
  --name "Premium Collection #1" \
  --image "./premium.png" \
  --royalties 10 \
  --collection "CollectionAddress"

# Create regular NFT with video
mplx tm create \
  --name "Video NFT" \
  --image "./thumbnail.png" \
  --animation "./video.mp4" \
  --pnft false
```

## Upcoming Commands

The Token Metadata command suite will expand to include:

- `mplx tm update` - Update NFT metadata and properties
- `mplx tm transfer` - Transfer NFTs with advanced controls
- `mplx tm burn` - Burn/destroy NFTs
- `mplx tm verify` - Verify collection membership
- `mplx tm delegate` - Manage NFT delegation and authorities

## See Also

- [Create Command](./create.md) - Detailed NFT creation documentation
- [Core Commands](../core.md) - Metaplex Core asset management
- [Toolbox Commands](../toolbox.md) - Utility and token commands
