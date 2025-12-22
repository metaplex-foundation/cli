# Bubblegum Quick Reference

Fast reference for all Metaplex Bubblegum compressed NFT commands.

## Tree Commands

### Create Tree

```bash
# Wizard mode (recommended)
mplx bg tree create --wizard

# Manual with all options
mplx bg tree create \
  --max-depth 14 \
  --max-buffer-size 64 \
  --canopy-depth 8 \
  --name "my-tree" \
  --public
```

**Common Tree Sizes:**

| Max NFTs | Max Depth | Buffer Size | Canopy | Cost |
|----------|-----------|-------------|--------|------|
| 16,384 | 14 | 64 | 8 | ~0.2 SOL |
| 131,072 | 17 | 64 | 10 | ~1.5 SOL |
| 1,048,576 | 20 | 64 | 11 | ~12 SOL |

### List Trees

```bash
# All trees
mplx bg tree list

# Filter by network
mplx bg tree list --network devnet
mplx bg tree list --network mainnet
```

## NFT Commands

### Create NFT

```bash
# Wizard mode
mplx bg nft create --wizard
mplx bg nft create <tree> --wizard

# With local files
mplx bg nft create <tree> \
  --name "My NFT" \
  --image ./image.png \
  --description "Description"

# With pre-uploaded metadata
mplx bg nft create <tree> \
  --name "My NFT" \
  --uri "https://example.com/metadata.json"

# With collection
mplx bg nft create <tree> \
  --name "My NFT" \
  --image ./image.png \
  --collection <coreCollectionId> \
  --royalties 5
```

### Fetch NFT

```bash
# Display info
mplx bg nft fetch <assetId>

# Download files
mplx bg nft fetch <assetId> --download

# Custom output directory
mplx bg nft fetch <assetId> --download --output ./my-nfts

# Proof only
mplx bg nft fetch <assetId> --proof-only

# JSON output
mplx bg nft fetch <assetId> --json
```

### Update NFT

```bash
# Editor mode (interactive)
mplx bg nft update <assetId> --editor

# Update specific fields
mplx bg nft update <assetId> --name "New Name"
mplx bg nft update <assetId> --description "New description"
mplx bg nft update <assetId> --symbol "NEWCNFT"

# Update image
mplx bg nft update <assetId> --image ./new-image.png

# Multiple fields
mplx bg nft update <assetId> \
  --name "New Name" \
  --description "New Description" \
  --image ./new-image.png

# Replace entire metadata
mplx bg nft update <assetId> --uri "https://example.com/new-metadata.json"
```

**Authority:** Requires tree authority OR collection authority (NOT owner)

### Transfer NFT

```bash
# Basic transfer
mplx bg nft transfer <assetId> <recipientAddress>

# JSON output
mplx bg nft transfer <assetId> <recipientAddress> --json
```

**Authority:** Requires current owner OR delegate

### Burn NFT

```bash
# Burn NFT
mplx bg nft burn <assetId>

# JSON output
mplx bg nft burn <assetId> --json
```

**Authority:** Requires current owner OR delegate

## Common Workflows

### Initial Setup

```bash
# 1. Configure RPC
mplx config set rpc https://devnet.helius-rpc.com/?api-key=YOUR_KEY

# 2. Set keypair
mplx config set keypair /path/to/keypair.json

# 3. Create tree
mplx bg tree create --wizard

# 4. Create collection (optional)
mplx core collection create --wizard
```

### Create and Mint NFTs

```bash
# 1. Create tree
mplx bg tree create --name "my-collection" --wizard

# 2. Create Core collection (optional)
COLLECTION=$(mplx core collection create --wizard | grep "Collection ID" | awk '{print $3}')

# 3. Mint NFTs
mplx bg nft create my-collection \
  --name "NFT #1" \
  --image ./1.png \
  --collection $COLLECTION \
  --royalties 5
```

### Bulk Minting

```bash
#!/bin/bash
TREE="my-tree"
COLLECTION="Abc123..."

for i in {1..100}; do
  mplx bg nft create $TREE \
    --name "NFT #$i" \
    --image "./images/$i.png" \
    --collection $COLLECTION \
    --royalties 5
done
```

### Transfer Workflow

```bash
# 1. Verify ownership
mplx bg nft fetch <assetId> | grep "Owner:"

# 2. Transfer
mplx bg nft transfer <assetId> <recipientAddress>

# 3. Verify transfer
mplx bg nft fetch <assetId> | grep "Owner:"
```

### Update Workflow

```bash
# 1. Set authority keypair
mplx config set keypair /path/to/authority-keypair.json

# 2. Backup current state
mplx bg nft fetch <assetId> --download --output ./backups

# 3. Update
mplx bg nft update <assetId> --editor

# 4. Verify
mplx bg nft fetch <assetId>
```

### Safe Burn Workflow

```bash
# 1. Verify asset
mplx bg nft fetch <assetId>

# 2. Backup metadata
mplx bg nft fetch <assetId> --download --output ./backups

# 3. Burn
mplx bg nft burn <assetId>
```

## Authority Reference

| Action | Required Authority |
|--------|-------------------|
| Create Tree | Payer (your wallet) |
| Mint NFT | Tree authority (if public: anyone) |
| Update NFT | Tree authority OR Collection authority |
| Transfer NFT | Owner OR Delegate |
| Burn NFT | Owner OR Delegate |

## Common Flags

### Global Flags

```bash
--json          # Output as JSON
--debug         # Debug logging
--help          # Show help
```

### Tree Creation Flags

```bash
--name <string>          # Tree name for easy reference
--max-depth <number>     # Tree depth (14-30)
--max-buffer-size <number>  # Concurrent buffer (8-2048)
--canopy-depth <number>  # Canopy depth (0-17)
--public                 # Allow public minting
--wizard                 # Interactive mode
```

### NFT Creation Flags

```bash
--name <string>          # NFT name (required)
--symbol <string>        # NFT symbol
--uri <url>              # Pre-uploaded metadata URI
--image <path>           # Local image file
--json <path>            # Local metadata JSON
--description <string>   # NFT description
--attributes <json>      # Trait attributes
--animation <path>       # Animation file (video/audio/3D)
--royalties <number>     # Royalty percentage (0-100)
--collection <address>   # Core collection ID
--owner <address>        # Recipient address
--wizard                 # Interactive mode
```

### NFT Update Flags

```bash
--name <string>          # Update name
--symbol <string>        # Update symbol
--description <string>   # Update description
--uri <url>              # Replace metadata URI
--image <path>           # Update image
--editor                 # Interactive editor mode
```

### NFT Fetch Flags

```bash
--download               # Download to files
--output <path>          # Custom output directory
--proof-only             # Fetch proof only
--json                   # JSON output
```

## Tree Size Calculator

```bash
# Calculate max NFTs for a given depth
max_nfts = 2^max_depth

# Examples:
# Depth 14 = 16,384 NFTs
# Depth 17 = 131,072 NFTs
# Depth 20 = 1,048,576 NFTs
```

## Cost Estimates

### Tree Creation

| Max NFTs | Approximate Cost |
|----------|-----------------|
| 16,384 | ~0.2 SOL |
| 131,072 | ~1.5 SOL |
| 1,048,576 | ~12 SOL |

**Factors:**
- Max depth (tree size)
- Canopy depth (proof optimization)
- Max buffer size (concurrent operations)

### NFT Operations

| Operation | Cost |
|-----------|------|
| Mint NFT | ~0.000005 SOL |
| Transfer | ~0.000005 SOL |
| Update | ~0.000005 SOL |
| Burn | ~0.000005 SOL |

Plus metadata upload costs (varies by storage provider).

## Network Configuration

### Devnet

```bash
mplx config set rpc https://devnet.helius-rpc.com/?api-key=YOUR_KEY
```

### Mainnet

```bash
mplx config set rpc https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
```

### Requirements

- RPC must support DAS (Digital Asset Standard) API
- Recommended: Helius or Triton RPC

## Examples by Use Case

### Small Collection (< 10,000)

```bash
# Create tree
mplx bg tree create \
  --max-depth 14 \
  --max-buffer-size 64 \
  --canopy-depth 8 \
  --name "small-collection" \
  --wizard

# Mint NFTs
for i in {1..1000}; do
  mplx bg nft create small-collection \
    --name "NFT #$i" \
    --image "./images/$i.png"
done
```

### Large Collection (100,000+)

```bash
# Create tree
mplx bg tree create \
  --max-depth 17 \
  --max-buffer-size 64 \
  --canopy-depth 10 \
  --name "large-collection"

# Mint in batches
for i in {1..100000}; do
  mplx bg nft create large-collection \
    --name "NFT #$i" \
    --image "./images/$i.png" \
    --collection $COLLECTION
done
```

### Music NFTs

```bash
mplx bg nft create my-tree \
  --name "Track #1" \
  --image ./album-cover.png \
  --animation ./track.mp3 \
  --description "First track from the album" \
  --project-url "https://artist.com" \
  --royalties 10
```

### Video NFTs

```bash
mplx bg nft create my-tree \
  --name "Short Film" \
  --image ./poster.png \
  --animation ./film.mp4 \
  --description "A compressed video NFT"
```

### 3D NFTs

```bash
mplx bg nft create my-tree \
  --name "3D Avatar" \
  --image ./preview.png \
  --animation ./avatar.glb \
  --description "Metaverse-ready 3D avatar"
```

## Troubleshooting Quick Fixes

### "No saved trees found"

```bash
mplx bg tree create --wizard
```

### "Asset not found"

```bash
# Check RPC supports DAS
mplx config set rpc https://devnet.helius-rpc.com/?api-key=YOUR_KEY
```

### "Signer is not the owner"

```bash
# For transfer/burn: use owner keypair
mplx config set keypair /path/to/owner-keypair.json

# For update: use authority keypair
mplx config set keypair /path/to/authority-keypair.json
```

### "Tree is full"

```bash
# Create new tree
mplx bg tree create --wizard
```

### "Invalid Core collection"

```bash
# Must use Core collection, not Token Metadata
mplx core collection create --wizard
```

## Next Steps

- [Bubblegum Overview](./README.md) - Learn the basics
- [Tree Creation Guide](./tree-create.md) - Detailed tree setup
- [NFT Creation Guide](./nft-create.md) - Comprehensive minting guide
- [Troubleshooting](./troubleshooting.md) - Common issues and solutions
