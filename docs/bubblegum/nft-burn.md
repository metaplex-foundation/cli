# Burning Compressed NFTs

Permanently destroy compressed NFTs and free up tree capacity.

## Quick Start

```bash
# Burn an NFT
mplx bg nft burn <assetId>

# With confirmation prompt
mplx bg nft burn <assetId> --confirm
```

## Usage

```bash
mplx bg nft burn B85zgpJnegSbFck28ddnLg4d9HH2g4ZpnL2qrK9oMBdj
```

## Authority Requirements

**Who can burn:**
- ✅ Current owner
- ✅ Current delegate (if one is set)
- ❌ Tree authority (cannot burn)
- ❌ Collection authority (cannot burn)

```bash
# Must use owner or delegate keypair
mplx config set keypair /path/to/owner-keypair.json
mplx bg nft burn <assetId>
```

## Process

The burn command automatically:

1. **Fetches asset and proof** via DAS API
2. **Verifies ownership** - checks signer is owner or delegate
3. **Executes burn** using `burnV2` instruction
4. **Confirms transaction** on-chain

```
Before Burn:          After Burn:
Owner: Alice     →     [NFT destroyed]
Tree: Active     →     Tree: Leaf freed
Data: Available  →     Data: Gone forever
```

## Examples

### Basic Burn

```bash
mplx bg nft burn <assetId>
```

### Verify Before Burning

```bash
# Check what you're burning
mplx bg nft fetch <assetId>

# Then burn
mplx bg nft burn <assetId>
```

### Batch Burn

```bash
#!/bin/bash
# Burn multiple NFTs
ASSETS=(asset1 asset2 asset3)

for asset in "${ASSETS[@]}"; do
  mplx bg nft burn $asset
done
```

### Burn from File

```bash
#!/bin/bash
# Read asset IDs from file
while read assetId; do
  mplx bg nft burn $assetId
done < to-burn.txt
```

## Output

### Success

```
✔ Asset and proof data fetched
✔ Compressed NFT burned successfully!

--------------------------------
Compressed NFT Burned!

Asset ID: B85zgpJnegSbFck28ddnLg4d9HH2g4ZpnL2qrK9oMBdj
Tree: BjgAh5ig1LTKbTCwA4rieiNpKQVjEzw9KVLnCptPWsKu

Signature: 5J7zKX9...
Explorer: https://explorer.solana.com/tx/5J7zKX9...
--------------------------------
```

### JSON Output

```bash
mplx bg nft burn <assetId> --json
```

```json
{
  "signature": "5J7zKX9...",
  "explorer": "https://explorer.solana.com/tx/5J7zKX9...",
  "assetId": "B85zgpJnegSbFck28ddnLg4d9HH2g4ZpnL2qrK9oMBdj",
  "tree": "BjgAh5ig1LTKbTCwA4rieiNpKQVjEzw9KVLnCptPWsKu"
}
```

## Troubleshooting

### "Signer is not the owner"

**Issue:** Not the current owner or delegate

**Solutions:**
```bash
# Check current owner
mplx bg nft fetch <assetId> | grep "Owner:"

# Use correct keypair
mplx config set keypair /path/to/owner-keypair.json
```

### "Asset not found"

**Issue:** Invalid asset ID or wrong network

**Solutions:**
```bash
# Verify asset ID
mplx bg nft fetch <assetId>

# Check you're on correct network
mplx config list
```

### "RPC does not support DAS API"

**Issue:** RPC lacks DAS support

**Solution:**
```bash
mplx config set rpc https://devnet.helius-rpc.com/?api-key=YOUR_KEY
```

### Transaction Failed

**Issue:** Network congestion or insufficient fees

**Solutions:**
```bash
# Retry
mplx bg nft burn <assetId>

# Check wallet balance
solana balance

# Check transaction
solana confirm <signature>
```

## Next Steps

- [Fetch NFTs](./nft-fetch.md) - Verify before burning
- [Transfer NFTs](./nft-transfer.md) - Alternative to burning
- [Create NFTs](./nft-create.md) - Mint new NFTs
