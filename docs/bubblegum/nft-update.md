# Updating Compressed NFTs

Update metadata for compressed NFTs using tree or collection authority.

## Quick Start

```bash
# Interactive editor mode
mplx bg nft update <assetId> --editor

# Update individual fields
mplx bg nft update <assetId> --name "New Name"

# Update with new image
mplx bg nft update <assetId> --image ./new-image.png

# Replace entire metadata
mplx bg nft update <assetId> --uri "https://example.com/new-metadata.json"
```

## Authority Requirements

⚠️ **Important:** Updates require **authority**, not ownership.

**Who can update:**
- ✅ Tree authority (if NFT has no collection)
- ✅ Collection update authority (if NFT is in a collection)
- ❌ NFT owner (cannot update, only transfer/burn)

```bash
# Use keypair with proper authority
mplx config set keypair /path/to/authority-keypair.json
mplx bg nft update <assetId> --editor
```

## Editor Mode

### Interactive Editing

```bash
mplx bg nft update <assetId> --editor
```

**Process:**
1. Fetches current metadata JSON
2. Opens in your default editor (nano/vi/notepad)
3. Edit and save
4. Uploads updated metadata
5. Updates on-chain

### Setting Your Editor

```bash
# Set preferred editor
export EDITOR=nano  # or vim, code, emacs, etc.

# Then use editor mode
mplx bg nft update <assetId> --editor
```

**Supported editors:**
- nano (default on Linux/Mac)
- vi/vim
- notepad (Windows)
- code (VS Code)
- Any terminal or GUI editor

## Field Updates

### Update Name

```bash
mplx bg nft update <assetId> --name "New Name"
```

### Update Description

```bash
mplx bg nft update <assetId> --description "New description text"
```

### Update Symbol

```bash
mplx bg nft update <assetId> --symbol "NEWCNFT"
```

### Update Image

```bash
mplx bg nft update <assetId> --image ./new-image.png
```

**Process:**
1. Uploads new image
2. Fetches existing metadata
3. Updates image URI
4. Uploads updated metadata
5. Updates on-chain

### Multiple Fields

```bash
mplx bg nft update <assetId> \
  --name "New Name" \
  --description "New Description" \
  --image ./new-image.png
```

### Complete Metadata Replacement

```bash
mplx bg nft update <assetId> --uri "https://example.com/new-metadata.json"
```

**Note:** Skips fetch and merge, uses new URI directly.

## Examples

### Fix Typo in Name

```bash
mplx bg nft update <assetId> --name "Correct Name"
```

### Add Description

```bash
mplx bg nft update <assetId> --description "This NFT represents..."
```

### Replace Image

```bash
mplx bg nft update <assetId> --image ./updated-artwork.png
```

### Update Everything

```bash
mplx bg nft update <assetId> --editor
```

Edit the full JSON in your editor.

### Batch Update

```bash
#!/bin/bash
ASSETS=(asset1 asset2 asset3)

for asset in "${ASSETS[@]}"; do
  mplx bg nft update $asset --description "Updated batch description"
done
```

## What Gets Updated

### On-Chain

- Name (stored in compressed format)
- URI (pointer to off-chain metadata)

### Off-Chain

When using field flags (not `--uri`):
- Description
- Image
- Symbol
- Attributes
- External URL
- All other metadata fields

## Editor Mode JSON

When using `--editor`, you'll see:

```json
{
  "name": "Current NFT Name",
  "description": "Current description",
  "image": "https://current-image-url.com/image.png",
  "symbol": "CNFT",
  "attributes": [
    {
      "trait_type": "Background",
      "value": "Blue"
    }
  ],
  "properties": {
    "files": [
      {
        "uri": "https://current-image-url.com/image.png",
        "type": "image/png"
      }
    ],
    "category": "image"
  },
  "external_url": "https://example.com"
}
```

**You can edit:**
- `name`
- `description`
- `image`
- `attributes[]`
- `external_url`
- Any other metadata fields

**Don't change:**
- `properties.files` structure (unless you know what you're doing)

## Troubleshooting

### "Signer is not the owner"

**Issue:** Error message is misleading - should say "not the authority"

**Solution:**
```bash
# Use tree authority or collection authority
# NOT the NFT owner
mplx config set keypair /path/to/authority-keypair.json
```

### "Editor exited with error"

**Issue:** Editor not found or crashed

**Solutions:**
```bash
# Set valid editor
export EDITOR=nano

# Or use field flags instead
mplx bg nft update <assetId> --name "New Name"
```

### "Failed to fetch metadata"

**Issue:** Current metadata URI unreachable

**Solution:**
```bash
# Use --uri to replace entirely
mplx bg nft update <assetId> --uri "https://new-metadata.com/meta.json"
```

### "Upload failed"

**Issue:** Storage provider error

**Solutions:**
```bash
# Check storage config
mplx config list

# Verify file exists
ls -lh ./new-image.png

# Try again
mplx bg nft update <assetId> --image ./new-image.png
```

## Next Steps

- [Transfer NFTs](./nft-transfer.md) - Change ownership
- [Burn NFTs](./nft-burn.md) - Destroy NFTs
- [Fetch NFTs](./nft-fetch.md) - Verify updates
