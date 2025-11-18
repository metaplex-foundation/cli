# Bubblegum Troubleshooting

Common issues and solutions when working with Metaplex Bubblegum compressed NFTs.

## Tree Creation Issues

### "Insufficient funds"

**Error:**
```
Error: Transaction failed: Account has insufficient funds
```

**Issue:** Not enough SOL to create tree

**Solutions:**
```bash
# Check balance
solana balance

# Get devnet SOL
solana airdrop 2

# For mainnet, ensure wallet has enough SOL
# Tree costs vary: 0.2 SOL (small) to 12+ SOL (large)
```

**Prevention:**
- Use `--wizard` mode to see cost estimate first
- Start with smaller trees on devnet
- Check balance before creating large trees

### "Invalid tree parameters"

**Error:**
```
Error: Invalid tree configuration
```

**Issue:** Incompatible max-depth, buffer-size, or canopy-depth

**Solutions:**
```bash
# Use wizard mode (validates parameters)
mplx bg tree create --wizard

# Manual constraints:
# - max-depth: 14-30
# - max-buffer-size: 8-2048 (power of 2)
# - canopy-depth: 0 to (max-depth - 1)
```

**Valid Examples:**
```bash
# Small tree
--max-depth 14 --max-buffer-size 64 --canopy-depth 8

# Medium tree
--max-depth 17 --max-buffer-size 64 --canopy-depth 10

# Large tree
--max-depth 20 --max-buffer-size 64 --canopy-depth 11
```

### "Transaction too large"

**Error:**
```
Error: Transaction size exceeded
```

**Issue:** Canopy depth too high for single transaction

**Solution:**
```bash
# Reduce canopy depth
mplx bg tree create \
  --max-depth 20 \
  --max-buffer-size 64 \
  --canopy-depth 10  # Instead of 11+
```

### "No saved trees found"

**Issue:** No trees in local storage

**Solutions:**
```bash
# Option 1: Create a tree
mplx bg tree create --wizard

# Option 2: Use tree address directly
mplx bg nft create <treeAddress> --wizard

# Option 3: Check storage file
cat ~/.config/mplx/trees.json
```

## NFT Creation Issues

### "Tree is full"

**Error:**
```
Error: Tree has reached maximum capacity
```

**Issue:** All tree leaves are used

**Solutions:**
```bash
# Check tree capacity
mplx bg tree list

# Create new tree
mplx bg tree create --wizard

# Mint to new tree
mplx bg nft create <newTree> --wizard
```

**Prevention:**
- Plan tree size for collection
- Monitor minted vs capacity
- Create multiple trees for large drops

### "Invalid Core collection"

**Error:**
```
Error: This is not a valid Metaplex Core collection
Tip: Create a Core collection with: mplx core collection create --wizard
```

**Issue:** Trying to use Token Metadata collection with Bubblegum

**Solution:**
```bash
# Create Core collection
mplx core collection create --wizard

# Use Core collection ID
mplx bg nft create <tree> \
  --collection <coreCollectionId> \
  --wizard
```

**Important:** Bubblegum V2 only works with Metaplex Core collections, not Token Metadata collections.

### "Upload failed"

**Error:**
```
Error: Failed to upload file
```

**Issue:** Storage provider error or file issues

**Solutions:**
```bash
# Check storage configuration
mplx config list

# Verify file exists
ls -lh ./image.png

# Check file format
file ./image.png

# Try again
mplx bg nft create <tree> --image ./image.png --wizard
```

**Common Causes:**
- File doesn't exist
- File corrupted or invalid format
- Storage provider unavailable
- API key issues

### "Metadata validation failed"

**Error:**
```
Error: Invalid metadata format
```

**Issue:** Malformed metadata JSON

**Solution:**
```bash
# Validate JSON
cat metadata.json | jq .

# Use wizard mode (generates valid metadata)
mplx bg nft create <tree> --wizard

# Or fix JSON structure
```

**Required Fields:**
```json
{
  "name": "NFT Name",
  "symbol": "CNFT",
  "description": "Description",
  "image": "https://...",
  "attributes": []
}
```

## NFT Fetch Issues

### "Asset not found"

**Error:**
```
Error: Asset not found
```

**Issue:** Invalid asset ID or wrong network

**Solutions:**
```bash
# Verify asset ID
echo <assetId>  # Should be 32-44 character base58

# Check current network
mplx config list

# Verify on correct network
mplx config set rpc https://devnet.helius-rpc.com/?api-key=YOUR_KEY

# Try fetch again
mplx bg nft fetch <assetId>
```

### "RPC does not support DAS API"

**Error:**
```
Error: RPC endpoint does not support Digital Asset Standard API
```

**Issue:** RPC lacks DAS support

**Solutions:**
```bash
# Use DAS-enabled RPC (Helius recommended)
mplx config set rpc https://devnet.helius-rpc.com/?api-key=YOUR_KEY

# Or Triton
mplx config set rpc https://devnet.rpcpool.com/YOUR_KEY
```

**Note:** Standard Solana RPCs (like public devnet) don't support DAS. You need Helius, Triton, or another DAS-enabled provider.

### "Proof data missing"

**Issue:** Incomplete proof data returned

**Solutions:**
```bash
# Ensure using latest CLI version
pnpm mplx --version

# Use JSON output for debugging
mplx bg nft fetch <assetId> --json

# Check DAS RPC is working
curl -X POST <rpcUrl> \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"1","method":"getAsset","params":["<assetId>"]}'
```

## NFT Update Issues

### "Signer is not the owner" (Update)

**Error:**
```
Error: Signer (A37B...) is not the owner (DBk8...) of this asset.
```

**Issue:** Trying to use owner keypair for update

**Explanation:** Updates require **authority**, not ownership.

**Solutions:**
```bash
# For NFTs WITHOUT collection: use tree authority
mplx config set keypair /path/to/tree-authority-keypair.json

# For NFTs WITH collection: use collection authority
mplx config set keypair /path/to/collection-authority-keypair.json

# Then update
mplx bg nft update <assetId> --editor
```

**Key Difference:**
- **Owner** can transfer and burn
- **Authority** can update metadata
- These are usually different wallets

### "Editor exited with error"

**Error:**
```
Error: Editor process failed
```

**Issue:** Editor not found or crashed

**Solutions:**
```bash
# Set valid editor
export EDITOR=nano

# Or use field flags instead
mplx bg nft update <assetId> --name "New Name"

# Available editors:
# - nano (default on Linux/Mac)
# - vim/vi
# - code (VS Code)
# - notepad (Windows)
```

### "Failed to fetch metadata"

**Error:**
```
Error: Could not fetch current metadata from URI
```

**Issue:** Current metadata URI unreachable

**Solutions:**
```bash
# Option 1: Replace metadata entirely
mplx bg nft update <assetId> --uri "https://new-metadata.com/meta.json"

# Option 2: Use field flags (doesn't fetch)
mplx bg nft update <assetId> --name "New Name" --description "New desc"
```

### "Failed to parse modified JSON"

**Error:**
```
Error: Failed to parse modified JSON: Unexpected token...
```

**Issue:** Invalid JSON syntax in editor

**Solutions:**
```bash
# Validate JSON before saving
# Common issues:
# - Missing commas
# - Trailing commas
# - Unquoted keys
# - Unclosed brackets

# Use JSON validator
cat temp.json | jq .

# Try again
mplx bg nft update <assetId> --editor
```

## NFT Transfer Issues

### "Signer is not the owner" (Transfer)

**Error:**
```
Error: Signer (A37B...) is not the owner (DBk8...) or delegate
```

**Issue:** Using wrong keypair

**Solutions:**
```bash
# Check current owner
mplx bg nft fetch <assetId> | grep "Owner:"

# Use owner keypair
mplx config set keypair /path/to/owner-keypair.json

# Or delegate keypair (if set)
mplx config set keypair /path/to/delegate-keypair.json

# Then transfer
mplx bg nft transfer <assetId> <recipient>
```

### "Invalid recipient address"

**Error:**
```
Error: Invalid recipient address
```

**Issue:** Malformed address

**Solutions:**
```bash
# Verify address format
echo <recipientAddress>
# Should be 32-44 characters, base58 encoded

# Example valid address:
# DBk8UfGm1bq2M9PKT5xcZK5a59B6khZmedFg2sv851uW

# Check for typos or extra characters
```

### "LeafIndexOutOfBounds"

**Error:**
```
Error Code: LeafIndexOutOfBounds. Error Number: 6008.
```

**Issue:** Internal error (should not happen with current CLI)

**Solutions:**
```bash
# Update to latest CLI version
pnpm update @metaplex-foundation/mplx-cli

# Report issue if persists
# This was fixed in recent updates
```

## NFT Burn Issues

### "Cannot burn delegated asset"

**Issue:** Trying to burn asset with delegate

**Solution:**
```bash
# Burn works with delegates
# Use delegate keypair
mplx config set keypair /path/to/delegate-keypair.json
mplx bg nft burn <assetId>

# Or use owner keypair
mplx config set keypair /path/to/owner-keypair.json
mplx bg nft burn <assetId>
```

### "Transaction failed" (Burn)

**Issue:** Network error or insufficient fees

**Solutions:**
```bash
# Check wallet balance
solana balance

# Retry burn
mplx bg nft burn <assetId>

# Check transaction
solana confirm <signature>
```

## Network Issues

### "Connection refused"

**Error:**
```
Error: connect ECONNREFUSED
```

**Issue:** RPC endpoint unreachable

**Solutions:**
```bash
# Check RPC URL
mplx config list

# Test RPC
curl <rpcUrl>

# Switch to working RPC
mplx config set rpc https://devnet.helius-rpc.com/?api-key=YOUR_KEY
```

### "Rate limit exceeded"

**Error:**
```
Error: 429 Too Many Requests
```

**Issue:** RPC rate limiting

**Solutions:**
```bash
# Use API key
mplx config set rpc https://devnet.helius-rpc.com/?api-key=YOUR_KEY

# Or upgrade RPC plan
# Or add delays in batch scripts:
sleep 0.1  # Between commands
```

### Wrong network

**Issue:** Tree from different network than current RPC

**Warning:**
```
⚠️  Warning: Selected tree is on 'mainnet' but current RPC is 'devnet'
```

**Solutions:**
```bash
# Check tree network
mplx bg tree list

# Switch to matching network
mplx config set rpc https://mainnet.helius-rpc.com/?api-key=YOUR_KEY

# Or filter trees by network
mplx bg tree list --network devnet
```

## Storage Issues

### "No storage provider configured"

**Issue:** Storage not set up for uploads

**Solution:**
```bash
# Configure storage
mplx config set storage <provider>

# Supported providers vary by CLI version
```

### "File too large"

**Error:**
```
Error: File exceeds maximum size
```

**Issue:** Asset file too large for storage provider

**Solutions:**
```bash
# Compress image
# PNG: use pngquant
# JPEG: reduce quality

# Or use external hosting
# Upload to IPFS, Arweave, etc.
# Then use --uri with hosted metadata
```

## JSON Output Issues

### "Cannot parse JSON"

**Issue:** Piping non-JSON output to jq

**Solution:**
```bash
# Always use --json flag
mplx bg nft fetch <assetId> --json | jq .

# Not:
mplx bg nft fetch <assetId> | jq .  # This fails
```

### "jq: command not found"

**Issue:** jq not installed

**Solutions:**
```bash
# Install jq
# macOS:
brew install jq

# Linux:
sudo apt-get install jq

# Or use --json without jq
mplx bg nft fetch <assetId> --json
```

## Configuration Issues

### "Config file not found"

**Issue:** No config file exists

**Solution:**
```bash
# Initialize config
mplx config init

# Or set values
mplx config set rpc <url>
mplx config set keypair <path>
```

### "Invalid keypair"

**Error:**
```
Error: Invalid keypair file
```

**Solutions:**
```bash
# Verify keypair file exists
ls -l /path/to/keypair.json

# Check file format (should be JSON array)
cat /path/to/keypair.json

# Generate new keypair if needed
solana-keygen new --outfile /path/to/new-keypair.json
```

## Best Practices to Avoid Issues

### 1. Always Test on Devnet First

```bash
# Test on devnet
mplx config set rpc https://devnet.helius-rpc.com/?api-key=YOUR_KEY
mplx bg nft create <tree> --wizard

# Then move to mainnet
mplx config set rpc https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
```

### 2. Use Wizard Mode

```bash
# Wizard validates inputs and guides you
mplx bg tree create --wizard
mplx bg nft create --wizard
```

### 3. Verify Before Executing

```bash
# Before transfer
mplx bg nft fetch <assetId>

# Before burn
mplx bg nft fetch <assetId> --download

# Before update
mplx bg nft fetch <assetId>
```

### 4. Use Named Trees

```bash
# Easier to manage
mplx bg tree create --name "my-collection" --wizard

# Reference by name
mplx bg nft create my-collection --wizard
```

### 5. Keep Transaction Records

```bash
# Save signatures
mplx bg nft create <tree> --wizard --json > mint-record.json

# Save receipts
SIG=$(mplx bg nft transfer <assetId> <recipient> --json | jq -r '.signature')
echo $SIG > transfer-$DATE.txt
```

## Getting Help

### Check Version

```bash
pnpm mplx --version
```

### Enable Debug Mode

```bash
mplx bg nft create <tree> --wizard --debug
```

### View Logs

```bash
# Check CLI logs
# Location varies by OS
```

### Report Issues

If you encounter bugs:

1. Update to latest version
2. Test on devnet
3. Collect error messages
4. Note transaction signatures
5. Report to Metaplex team

## Next Steps

- [Quick Reference](./quick-reference.md) - Command cheat sheet
- [Bubblegum Overview](./README.md) - Learn the basics
- [Tree Creation](./tree-create.md) - Detailed tree guide
- [NFT Creation](./nft-create.md) - Comprehensive minting guide
