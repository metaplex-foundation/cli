# Fetching Compressed NFTs

Retrieve asset data and merkle proofs for compressed NFTs.

## Quick Start

```bash
# Display asset information
mplx bg nft fetch <assetId>

# Download to files
mplx bg nft fetch <assetId> --download

# Get proof only
mplx bg nft fetch <assetId> --proof-only

# JSON output
mplx bg nft fetch <assetId> --json
```

## Basic Usage

```bash
mplx bg nft fetch B85zgpJnegSbFck28ddnLg4d9HH2g4ZpnL2qrK9oMBdj
```

## Output

### Standard Display

```
Compressed NFT Details
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Asset ID: B85zgpJnegSbFck28ddnLg4d9HH2g4ZpnL2qrK9oMBdj
Name: cNFTv2 Test
Symbol: 
Compressed: true

Description:
This is a test cNFTv2 on BubblegumV2

Metadata URI:
https://gateway.irys.xyz/459NwenxaeQQXr86j2cry3UwN41Lmc8N3ht21vtfoyJb

Image:
https://gateway.irys.xyz/45racdyiEvBrcccGG7avffaupKx3AR67a1AFQM2qa6Xm

Tree Information
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Tree: BjgAh5ig1LTKbTCwA4rieiNpKQVjEzw9KVLnCptPWsKu
Leaf ID: 0
Owner: A37BMLuGtSNkjheuJWmfRrYDEerdctbsGLe43Luz6sVG

Merkle Proof
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Root: AC7NkuaGLvnHjxnvJnNVqKjJGRrsCVPZhmiLc4ttkd7J
Node Index: 16384
Proof Nodes: 14
Tree ID: BjgAh5ig1LTKbTCwA4rieiNpKQVjEzw9KVLnCptPWsKu

Royalty Information
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Royalty: 5%
Primary Sale: false

Creators
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. A37BMLuGtSNkjheuJWmfRrYDEerdctbsGLe43Luz6sVG (100%) ✓ Verified
```

## Download Options

### Download All Data

```bash
mplx bg nft fetch <assetId> --download
```

**Creates:**
- `asset.json` - Full asset data
- `proof.json` - Merkle proof data

### Custom Output Directory

```bash
mplx bg nft fetch <assetId> --download --output ./my-nfts
```

**Creates:**
```
my-nfts/
├── <assetId>-asset.json
└── <assetId>-proof.json
```

### Proof Only

```bash
mplx bg nft fetch <assetId> --proof-only
```

Fetches only the merkle proof (faster, less data).

## JSON Output

```bash
mplx bg nft fetch <assetId> --json
```

```json
{
  "asset": {
    "id": "B85zgpJnegSbFck28ddnLg4d9HH2g4ZpnL2qrK9oMBdj",
    "content": {
      "metadata": {
        "name": "cNFTv2 Test",
        "symbol": "",
        "description": "This is a test cNFTv2"
      },
      "json_uri": "https://...",
      "files": [...]
    },
    "compression": {
      "tree": "BjgAh5ig1LTKbTCwA4rieiNpKQVjEzw9KVLnCptPWsKu",
      "leaf_id": 0,
      "seq": 1
    },
    "ownership": {
      "owner": "A37BMLuGtSNkjheuJWmfRrYDEerdctbsGLe43Luz6sVG"
    }
  },
  "proof": {
    "root": "AC7NkuaGLvnHjxnvJnNVqKjJGRrsCVPZhmiLc4ttkd7J",
    "proof": [...],
    "node_index": 16384,
    "tree_id": "BjgAh5ig1LTKbTCwA4rieiNpKQVjEzw9KVLnCptPWsKu"
  }
}
```

## Understanding the Data

### Asset Information

- **Asset ID**: Unique identifier (PDA from tree + leaf)
- **Name/Symbol**: On-chain metadata
- **Description**: From off-chain JSON
- **Metadata URI**: Off-chain JSON location
- **Image**: Primary asset file

### Tree Information

- **Tree**: Merkle tree address
- **Leaf ID**: Position in tree (0 to max-1)
- **Owner**: Current owner address
- **Delegate**: Current delegate (if any)

### Merkle Proof

- **Root**: Current tree root hash
- **Proof Nodes**: Hashes needed to prove leaf
- **Node Index**: Position in full tree structure
- **Leaf**: Hash of this specific NFT

The merkle proof is required for all on-chain operations.

### Collection Information

If part of a collection:
```
Collection
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Collection ID: Abc123...
Verified: true
```

### Royalty Information

- **Royalty %**: Creator royalty percentage
- **Primary Sale**: Whether initial sale happened
- **Locked**: Whether royalties are locked

### Creators

List of creators with:
- Address
- Share percentage
- Verification status

## Troubleshooting

### "Asset not found"

**Issue:** Invalid asset ID or RPC doesn't support DAS

**Solutions:**
```bash
# Verify asset ID
echo <assetId>

# Check RPC supports DAS
mplx config list

# Switch to DAS-enabled RPC
mplx config set rpc https://devnet.helius-rpc.com/?api-key=YOUR_KEY
```

### "RPC does not support DAS API"

**Solution:**
```bash
# Use Helius or Triton
mplx config set rpc https://devnet.helius-rpc.com/?api-key=YOUR_KEY
```

### Proof data missing

**Issue:** --proof-only but getting full data

**Solution:**
```bash
# Ensure using latest version
mplx --version

# Use --json for structured output
mplx bg nft fetch <assetId> --proof-only --json
```

## Next Steps

- [Update NFTs](./nft-update.md) - Modify metadata
- [Transfer NFTs](./nft-transfer.md) - Change ownership
- [Burn NFTs](./nft-burn.md) - Destroy NFTs
