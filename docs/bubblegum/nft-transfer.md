# Transferring Compressed NFTs

Transfer ownership of compressed NFTs to new wallets.

## Quick Start

```bash
mplx bg nft transfer <assetId> <newOwnerAddress>
```

## Usage

```bash
mplx bg nft transfer B85zgpJnegSbFck28ddnLg4d9HH2g4ZpnL2qrK9oMBdj \
  DBk8UfGm1bq2M9PKT5xcZK5a59B6khZmedFg2sv851uW
```

## Authority Requirements

**Who can transfer:**
- ✅ Current owner
- ✅ Current delegate (if one is set)
- ❌ Tree authority (cannot transfer)
- ❌ Collection authority (cannot transfer)

```bash
# Must use owner or delegate keypair
mplx config set keypair /path/to/owner-keypair.json
mplx bg nft transfer <assetId> <newOwner>
```

## Process

The transfer command automatically:

1. **Fetches asset and proof** via DAS API
2. **Verifies ownership** - checks signer is owner or delegate
3. **Executes transfer** using `transferV2` instruction
4. **Confirms transaction** on-chain

```
Current State:           New State:
Owner: Alice       →     Owner: Bob
Delegate: None     →     Delegate: None
```

## Examples

### Basic Transfer

```bash
mplx bg nft transfer <assetId> <recipientAddress>
```

### Transfer to Specific Wallet

```bash
# Transfer to friend
mplx bg nft transfer B85zgpJnegSbFck28ddnLg4d9HH2g4ZpnL2qrK9oMBdj \
  FriendWa11et...

# Transfer to marketplace escrow
mplx bg nft transfer <assetId> MarketP1aceEscrow...
```

### Batch Transfer

```bash
#!/bin/bash
RECIPIENT="RecipientAddress..."

# Transfer multiple NFTs
for asset in asset1 asset2 asset3; do
  mplx bg nft transfer $asset $RECIPIENT
done
```

### Transfer from Script

```bash
#!/bin/bash
# Read asset IDs from file
while read assetId; do
  mplx bg nft transfer $assetId $NEW_OWNER
done < assets.txt
```

## Output

### Success

```
✔ Asset and proof data fetched
✔ Compressed NFT transferred successfully!

--------------------------------
Compressed NFT Transferred!

Asset ID: B85zgpJnegSbFck28ddnLg4d9HH2g4ZpnL2qrK9oMBdj
From: A37BMLuGtSNkjheuJWmfRrYDEerdctbsGLe43Luz6sVG
To: DBk8UfGm1bq2M9PKT5xcZK5a59B6khZmedFg2sv851uW
Tree: BjgAh5ig1LTKbTCwA4rieiNpKQVjEzw9KVLnCptPWsKu

Signature: 5J7zKX9...
Explorer: https://explorer.solana.com/tx/5J7zKX9...
--------------------------------
```

### JSON Output

```bash
mplx bg nft transfer <assetId> <newOwner> --json
```

```json
{
  "signature": "5J7zKX9...",
  "explorer": "https://explorer.solana.com/tx/5J7zKX9...",
  "assetId": "B85zgpJnegSbFck28ddnLg4d9HH2g4ZpnL2qrK9oMBdj",
  "from": "A37BMLuGtSNkjheuJWmfRrYDEerdctbsGLe43Luz6sVG",
  "to": "DBk8UfGm1bq2M9PKT5xcZK5a59B6khZmedFg2sv851uW",
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

### "Invalid recipient address"

**Issue:** Malformed address

**Solutions:**
```bash
# Verify address format
echo <recipientAddress>

# Should be 32-44 characters base58
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

## Next Steps

- [Fetch NFTs](./nft-fetch.md) - Verify transfer
- [Burn NFTs](./nft-burn.md) - Destroy NFTs
- [Update NFTs](./nft-update.md) - Modify metadata
