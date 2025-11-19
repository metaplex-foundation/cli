# Creating Merkle Trees

Merkle trees are on-chain accounts that store compressed NFT data. You pay rent once for the tree, then can mint up to the tree's capacity with minimal additional cost.

## Quick Start

```bash
# Interactive wizard (recommended)
mplx bg tree create --wizard

# Manual creation
mplx bg tree create \
  --maxDepth 14 \
  --maxBufferSize 64 \
  --canopyDepth 8 \
  --name "my-tree"
```

## Using the Wizard

The wizard guides you through tree creation with pre-configured sizes:

```bash
mplx bg tree create --wizard
```

### Pre-Configured Sizes

| Name | Max NFTs | Max Depth | Buffer Size | Canopy | Proof Nodes | ~Cost |
|------|----------|-----------|-------------|--------|-------------|-------|
| **Tiny** | 16 | 4 | 8 | 0 | 4 | 0.00015 SOL |
| **Small** | 128 | 7 | 8 | 3 | 4 | 0.00025 SOL |
| **Medium** | 16,384 | 14 | 64 | 8 | 6 | 0.15 SOL |
| **Large** | 131,072 | 17 | 64 | 11 | 6 | 1.13 SOL |
| **X-Large** | 1,048,576 | 20 | 256 | 14 | 6 | 8.5 SOL |
| **XX-Large** | 1,048,576 | 20 | 2048 | 14 | 6 | 24 SOL |
| **Custom** | Your choice | - | - | - | - | Varies |

**Wizard Flow:**
1. Select tree size or custom
2. Choose public/private access
3. Provide a memorable name
4. Review configuration and cost
5. Confirm and create

## Manual Creation

For custom configurations:

```bash
mplx bg tree create \
  --maxDepth <number> \
  --maxBufferSize <number> \
  --canopyDepth <number> \
  --name <string> \
  [--public]
```

### Parameters

#### Max Depth (Required)

Determines maximum number of NFTs:
```
max_nfts = 2^maxDepth
```

**Examples:**
- Depth 10 = 1,024 NFTs
- Depth 14 = 16,384 NFTs
- Depth 17 = 131,072 NFTs
- Depth 20 = 1,048,576 NFTs

**Choosing Depth:**
- Estimate your collection size
- Add 20-30% buffer for growth
- Trees **cannot be expanded** after creation

```bash
# For ~10,000 NFT collection
mplx bg tree create --maxDepth 14 ...  # Supports 16,384

# For ~100,000 NFT collection
mplx bg tree create --maxDepth 17 ...  # Supports 131,072
```

#### Max Buffer Size (Required)

Number of concurrent changes allowed:

- **8**: Low concurrency (sequential minting)
- **64**: Medium concurrency (recommended)
- **256**: High concurrency (parallel minting)
- **2048**: Very high concurrency (burst minting)

**Recommendation:** Use 64 for most use cases

```bash
# Standard configuration
mplx bg tree create --maxBufferSize 64 ...

# High-volume minting
mplx bg tree create --maxBufferSize 256 ...
```

#### Canopy Depth (Required)

On-chain cache of proof nodes (0 to maxDepth):

**How it works:**
- Higher canopy = fewer proof nodes needed in transactions
- Lower canopy = smaller tree, less rent
- Canopy depth cannot exceed max depth

**Formula:**
```
proof_nodes_required = maxDepth - canopyDepth
```

**Examples:**
- maxDepth 14, canopy 0 = 14 proof nodes required
- maxDepth 14, canopy 7 = 7 proof nodes required
- maxDepth 14, canopy 14 = 0 proof nodes required

**Recommendations:**
- **Small trees**: canopy = 0 (proof nodes are cheap)
- **Medium trees**: canopy = maxDepth / 2 (balanced)
- **Large trees**: canopy = maxDepth / 2 or more (simplify transactions)

```bash
# Balanced configuration for medium tree
mplx bg tree create --maxDepth 14 --canopyDepth 7 ...

# Maximum simplicity (more expensive)
mplx bg tree create --maxDepth 14 --canopyDepth 14 ...
```

#### Name (Optional)

Memorable name for the tree:

```bash
mplx bg tree create --name "my-collection-tree" ...
```

**Benefits:**
- Reference by name in other commands
- Easier to identify in listings
- Saved in `~/.config/mplx/trees.json`

**Usage:**
```bash
# Create with name
mplx bg tree create --wizard --name "my-tree"

# Use by name later
mplx bg nft create my-tree --wizard
```

#### Public Flag (Optional)

Allow anyone to mint to the tree:

```bash
# Private tree (default) - only you can mint
mplx bg tree create --wizard

# Public tree - anyone can mint
mplx bg tree create --wizard --public
```

⚠️ **Warning:** Public trees allow **anyone** to mint. Use only if you specifically need public minting.

**Public Tree Confirmation:**
The wizard requires double confirmation for public trees:
1. Initial selection
2. Explicit confirmation with understanding

## Examples

### Small Project (< 100 NFTs)

```bash
mplx bg tree create \
  --maxDepth 7 \
  --maxBufferSize 8 \
  --canopyDepth 3 \
  --name "small-collection"
```

- **Capacity:** 128 NFTs
- **Cost:** ~0.00025 SOL
- **Use case:** Small art drops, limited editions

### Medium Collection (~10,000 NFTs)

```bash
mplx bg tree create \
  --maxDepth 14 \
  --maxBufferSize 64 \
  --canopyDepth 8 \
  --name "medium-collection"
```

- **Capacity:** 16,384 NFTs
- **Cost:** ~0.15 SOL
- **Use case:** Standard NFT collections

### Large Project (~100,000 NFTs)

```bash
mplx bg tree create \
  --maxDepth 17 \
  --maxBufferSize 64 \
  --canopyDepth 11 \
  --name "large-collection"
```

- **Capacity:** 131,072 NFTs
- **Cost:** ~1.13 SOL
- **Use case:** Large collections, gaming assets

### Mega Collection (1M+ NFTs)

```bash
mplx bg tree create \
  --maxDepth 20 \
  --maxBufferSize 256 \
  --canopyDepth 14 \
  --name "mega-collection"
```

- **Capacity:** 1,048,576 NFTs
- **Cost:** ~8.5 SOL
- **Use case:** Massive collections, dynamic NFTs

### Public Minting Tree

```bash
mplx bg tree create \
  --maxDepth 14 \
  --maxBufferSize 64 \
  --canopyDepth 8 \
  --name "public-mint-tree" \
  --public
```

- **Access:** Anyone can mint
- **Use case:** Public mint events, community projects

## Understanding Costs

### Rent Calculation

Tree rent is based on:
1. **Max Depth** - More NFTs = more storage
2. **Max Buffer Size** - Larger buffer = more storage
3. **Canopy Depth** - More cached proofs = more storage

**Approximate Formula:**
```
rent ≈ base_rent × (maxDepth_factor + buffer_factor + canopy_factor)
```

### Cost Optimization

**To reduce costs:**
- Lower canopy depth (trade-off: more complex transactions)
- Smaller buffer size (trade-off: less concurrency)
- Right-size max depth (only pay for what you need)

**To optimize UX:**
- Higher canopy depth (simpler transactions)
- Larger buffer size (better concurrency)
- Add capacity buffer (avoid creating new tree)

## Saved Trees

Trees created with `--name` are saved to:
```
~/.config/mplx/trees.json
```

**Saved information:**
- Name
- Address
- Network (mainnet/devnet/testnet/localnet)
- Max depth, buffer size, canopy depth
- Max NFTs capacity
- Public/private status
- Creation date and signature

**View saved trees:**
```bash
mplx bg tree list
mplx bg tree list --network devnet
```

## Troubleshooting

### "Insufficient funds"

**Issue:** Not enough SOL for tree rent

**Solution:**
```bash
# Check balance
solana balance

# Use smaller tree
mplx bg tree create --wizard  # Select "Small" or "Tiny"
```

### "Invalid canopy depth"

**Issue:** Canopy depth exceeds max depth

**Solution:**
```bash
# Canopy must be ≤ maxDepth
mplx bg tree create --maxDepth 14 --canopyDepth 14 ...  # Max canopy
```

### Can't find saved tree

**Issue:** Tree not showing in list

**Solution:**
```bash
# Check network filter
mplx bg tree list --network devnet

# Verify config file
cat ~/.config/mplx/trees.json
```

## Next Steps

- [List Trees](./tree-list.md) - View and manage your trees
- [Create NFTs](./nft-create.md) - Start minting compressed NFTs
- [Quick Reference](./quick-reference.md) - Command cheat sheet
