# Listing Merkle Trees

View and manage your saved Bubblegum trees.

## Quick Start

```bash
# List all saved trees
mplx bg tree list

# Filter by network
mplx bg tree list --network devnet
mplx bg tree list --network mainnet
```

## Usage

### List All Trees

```bash
mplx bg tree list
```

**Output:**
```
┌─────────┬──────────────────────────────────────────────┬─────────┬──────────┬────────┬────────────────────┐
│ Name    │ Address                                      │ Network │ Max NFTs │ Public │ Created            │
├─────────┼──────────────────────────────────────────────┼─────────┼──────────┼────────┼────────────────────┤
│ test1   │ BjgAh5ig1LTKbTCwA4rieiNpKQVjEzw9KVLnCptPWsKu │ devnet  │ 16,384   │ false  │ 2025-07-26 13:13   │
│ mainnet │ 9hSUfeG3DZvqhQmyv8cgUmEJwKaxTgStAy1Ld7bewRvG │ mainnet │ 131,072  │ false  │ 2025-11-17 13:19   │
└─────────┴──────────────────────────────────────────────┴─────────┴──────────┴────────┴────────────────────┘
```

### Filter by Network

```bash
# Devnet only
mplx bg tree list --network devnet

# Mainnet only
mplx bg tree list --network mainnet

# Testnet
mplx bg tree list --network testnet

# Localnet
mplx bg tree list --network localnet
```

## Displayed Information

| Column | Description |
|--------|-------------|
| **Name** | Memorable name given at creation |
| **Address** | On-chain tree account address |
| **Network** | Solana network (mainnet/devnet/testnet/localnet) |
| **Max NFTs** | Maximum capacity (2^maxDepth) |
| **Public** | Whether anyone can mint (true/false) |
| **Created** | Creation timestamp |

## Storage Location

Trees are saved in:
```
~/.config/mplx/trees.json
```

**Full data stored:**
- Name
- Address
- Network and genesis hash
- Max depth, buffer size, canopy depth
- Max NFTs capacity
- Public/private flag
- Creation date
- Creation transaction signature

## Using Tree Names

Trees with names can be referenced by name in other commands:

```bash
# List trees
mplx bg tree list

# Output shows tree named "my-tree"
# Use by name instead of address:
mplx bg nft create my-tree --wizard
```

## Examples

### View All Trees

```bash
mplx bg tree list
```

Shows all trees across all networks.

### View Trees for Current Network

```bash
# Configure RPC first
mplx config set rpc https://devnet.helius-rpc.com/?api-key=YOUR_KEY

# List devnet trees
mplx bg tree list --network devnet
```

### Check Tree Capacity

```bash
mplx bg tree list
```

Look at the "Max NFTs" column to see remaining capacity for each tree.

### Identify Public Trees

```bash
mplx bg tree list
```

The "Public" column shows which trees allow public minting.

## No Trees Found

If you see "No saved trees found":

```bash
# Create your first tree
mplx bg tree create --wizard

# Then list again
mplx bg tree list
```

## Network Filtering

### Why Filter by Network?

Trees are network-specific. Filtering helps you:
- Find trees for your current RPC
- Separate dev/prod environments
- Avoid using wrong network trees

### Automatic Network Detection

The CLI detects your network from:
1. RPC endpoint genesis hash
2. Matches against saved tree networks

### Cross-Network Warning

When creating NFTs, if you select a tree from a different network:

```
⚠️  Warning: Selected tree is on 'mainnet' but current RPC is 'devnet'
```

## Managing Saved Trees

### View Raw Data

```bash
cat ~/.config/mplx/trees.json
```

**Example output:**
```json
[
  {
    "name": "my-tree",
    "address": "BjgAh5ig1LTKbTCwA4rieiNpKQVjEzw9KVLnCptPWsKu",
    "maxDepth": 14,
    "maxBufferSize": 64,
    "canopyDepth": 8,
    "isPublic": false,
    "maxNfts": 16384,
    "createdAt": "2025-07-26T13:13:47.717Z",
    "signature": "8DXRNFv6ymjcYBTZQMon2qoV7joYPF4MRWwMaRvB1jGp...",
    "network": "devnet",
    "genesisHash": "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG"
  }
]
```

### Manually Edit

You can manually edit `trees.json` to:
- Add trees from other sources
- Update tree names
- Remove old trees

**Important:** Ensure proper JSON format.

### Remove Trees

```bash
# Edit file to remove entries
nano ~/.config/mplx/trees.json

# Or delete entire file to start fresh
rm ~/.config/mplx/trees.json
```

## Integration with Other Commands

### Create NFTs

```bash
# List trees to find name
mplx bg tree list

# Use tree name
mplx bg nft create my-tree --wizard
```

### Tree Selection Prompt

When using `--wizard` without specifying a tree:

```bash
mplx bg nft create --wizard
```

You'll see a selection prompt showing all trees from `bg tree list`.

## Troubleshooting

### "No saved trees found"

**Issue:** No trees in storage

**Solutions:**
```bash
# Option 1: Create a tree
mplx bg tree create --wizard

# Option 2: Use tree address directly
mplx bg nft create <treeAddress> --wizard
```

### Trees from wrong network showing

**Issue:** Seeing mainnet trees when on devnet

**Solutions:**
```bash
# Filter by network
mplx bg tree list --network devnet

# Or configure RPC
mplx config set rpc https://devnet.helius-rpc.com/?api-key=YOUR_KEY
```

### Tree shows but can't be used

**Issue:** RPC network doesn't match tree network

**Solution:**
```bash
# Check tree's network
mplx bg tree list

# Switch to matching RPC
mplx config set rpc <matching-network-rpc>
```

## Next Steps

- [Create Trees](./tree-create.md) - Create new merkle trees
- [Create NFTs](./nft-create.md) - Mint to your trees
- [Quick Reference](./quick-reference.md) - Command cheat sheet
