# Bubblegum V2 - Compressed NFTs

Bubblegum is Metaplex's compression standard for NFTs on Solana. It uses concurrent merkle trees to dramatically reduce the cost of minting and storing NFTs while maintaining composability with the rest of the Solana ecosystem.

## What is Bubblegum?

**Bubblegum V2** enables compressed NFTs that cost ~1000x less to mint than regular NFTs. Instead of creating individual accounts for each NFT, Bubblegum stores NFT data in concurrent merkle trees, paying only for tree rent regardless of how many NFTs are minted.

### Key Features

- **Massive Cost Savings**: After tree rent, minting costs ~0.000005 SOL per NFT
- **Composability**: Works with DAS API for wallet/marketplace integration
- **Core Collections**: Uses Metaplex Core collections (V2)
- **Full Functionality**: Create, update, transfer, and burn operations

### V2 Updates

Bubblegum V2 introduces:
- **Metaplex Core Collections** (not Token Metadata)
- Simplified metadata format (MetadataArgsV2)
- Improved collection integration
- Better update authority handling

## Quick Start

```bash
# 1. Create a Core collection (optional but recommended)
mplx core collection create --wizard

# 2. Create a Bubblegum tree
mplx bg tree create --wizard

# 3. Create compressed NFTs
mplx bg nft create --wizard

# 4. Update metadata
mplx bg nft update <assetId> --editor

# 5. Transfer to new owner
mplx bg nft transfer <assetId> <newOwner>

# 6. Burn NFT (irreversible)
mplx bg nft burn <assetId>
```

## Documentation

### Tree Management
- [Creating Merkle Trees](./tree-create.md) - Create and configure trees
- [Listing Trees](./tree-list.md) - View saved trees

### NFT Operations
- [Creating NFTs](./nft-create.md) - Mint compressed NFTs
- [Fetching NFTs](./nft-fetch.md) - Retrieve asset data and proofs
- [Updating NFTs](./nft-update.md) - Update metadata
- [Transferring NFTs](./nft-transfer.md) - Transfer ownership
- [Burning NFTs](./nft-burn.md) - Permanently destroy NFTs

### Reference
- [Quick Reference](./quick-reference.md) - Command cheat sheet
- [Troubleshooting](./troubleshooting.md) - Common issues and solutions

## How It Works

### Concurrent Merkle Trees

Bubblegum uses **concurrent merkle trees** to store compressed NFT data:

```
Tree Account (On-Chain)
├── Root Hash
├── Merkle Tree Data
└── Canopy (cached proof nodes)

NFT Data (Off-Chain + On-Chain)
├── Asset ID (derived from tree + leaf)
├── Metadata (off-chain JSON)
└── Merkle Proof (via DAS API)
```

**Key Concepts:**

- **Tree**: On-chain account storing the merkle tree structure
- **Leaf**: Individual NFT data stored in the tree
- **Asset ID**: Unique identifier derived from tree address + leaf index
- **Proof**: Merkle proof required for on-chain operations
- **Canopy**: On-chain cache of proof nodes (reduces transaction size)

### Authority Model

| Operation | Authority Required |
|-----------|-------------------|
| Create NFT | Tree authority (or anyone if public) |
| Update Metadata | Tree authority OR Collection authority |
| Transfer NFT | Current owner OR Delegate |
| Burn NFT | Current owner OR Delegate |

**Important:** The NFT owner **cannot** update metadata. Only tree/collection authority can update.

## Cost Comparison

### Regular NFT vs Compressed NFT

| Item | Regular NFT | Compressed NFT |
|------|-------------|----------------|
| Mint Account | ~0.012 SOL | ~0 SOL (shared tree) |
| Metadata Account | ~0.006 SOL | ~0 SOL (shared tree) |
| Transaction Fee | ~0.000005 SOL | ~0.000005 SOL |
| **Per NFT Cost** | **~0.018 SOL** | **~0.000005 SOL** |

### Tree Rent Examples

| Tree Size | Max NFTs | Rent Cost | Cost per NFT |
|-----------|----------|-----------|--------------|
| Small | 128 | 0.00025 SOL | ~0.000002 SOL |
| Medium | 16,384 | 0.15 SOL | ~0.000009 SOL |
| Large | 131,072 | 1.13 SOL | ~0.000009 SOL |
| X-Large | 1,048,576 | 8.5 SOL | ~0.000008 SOL |

**Example:** Minting 10,000 NFTs
- Regular: ~180 SOL
- Compressed: ~0.2 SOL (tree rent + transaction fees)
- **Savings: ~99.9%**

## Prerequisites

### RPC Requirements

Compressed NFTs require an RPC provider with **DAS API support**:

✅ **Supported Providers:**
- [Helius](https://helius.dev) (Recommended)
- [Triton](https://triton.one)
- Any RPC with DAS API

❌ **Not Supported:**
- Public Solana RPCs (no DAS API)

**Set your RPC:**
```bash
mplx config set rpc https://devnet.helius-rpc.com/?api-key=YOUR_KEY
```

### Wallet Setup

```bash
# Set keypair for signing
mplx config set keypair /path/to/keypair.json

# Or use Ledger
mplx config set keypair usb://ledger?key=0
```

## Core Collection Integration

Bubblegum V2 uses **Metaplex Core collections**:

```bash
# Create Core collection
mplx core collection create --wizard

# Link compressed NFTs to collection
mplx bg nft create <tree> --collection <coreCollectionId> --wizard
```

**Benefits:**
- Grouped NFTs for marketplaces
- Collection-level metadata and royalties
- Collection authority can update all NFTs

**Note:** Token Metadata collections are **not compatible** with Bubblegum V2.

## Best Practices

### 1. Tree Sizing

✅ **Do:**
- Estimate collection size carefully
- Add 20-30% buffer for growth
- Use wizard's pre-configured sizes

❌ **Don't:**
- Under-estimate (trees can't expand)
- Over-pay for unused capacity
- Create public trees without need

### 2. Canopy Depth

**Canopy** stores proof nodes on-chain, reducing transaction complexity:

- **Low Canopy (0-5)**: Lower rent, more complex transactions
- **Medium Canopy (maxDepth/2)**: Balanced (recommended)
- **High Canopy (>maxDepth/2)**: Higher rent, simpler transactions

**Recommendation:** Use maxDepth / 2 for most use cases

### 3. Security

✅ **Secure:**
- Private trees (default)
- Protected tree/collection authority keys
- Verify collection addresses

❌ **Risky:**
- Public trees (anyone can mint)
- Sharing authority keys
- Using unverified collections

## Next Steps

1. **[Create a Tree](./tree-create.md)** - Set up your merkle tree
2. **[Create NFTs](./nft-create.md)** - Start minting compressed NFTs
3. **[Fetch NFTs](./nft-fetch.md)** - Retrieve and verify your NFTs

## Resources

- [Bubblegum Documentation](https://developers.metaplex.com/bubblegum)
- [Metaplex Core Documentation](https://developers.metaplex.com/core)
- [DAS API Specification](https://docs.metaplex.com/das-api)
- [State Compression Overview](https://docs.solana.com/learn/state-compression)

## Support

- **GitHub Issues:** https://github.com/metaplex-foundation/cli/issues
- **Discord:** https://discord.gg/metaplex
- **Documentation:** https://developers.metaplex.com
