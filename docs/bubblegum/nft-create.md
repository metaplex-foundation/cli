# Creating Compressed NFTs

Mint compressed NFTs to your Bubblegum trees with minimal cost.

## Quick Start

```bash
# Wizard mode (recommended)
mplx bg nft create --wizard

# Wizard with specific tree
mplx bg nft create my-tree --wizard

# Manual with URI
mplx bg nft create <tree> --name "My NFT" --uri "https://example.com/metadata.json"

# Manual with local files
mplx bg nft create <tree> --name "My NFT" --image ./image.png
```

## Wizard Mode

The interactive wizard guides you through NFT creation:

```bash
mplx bg nft create --wizard
```

**Wizard steps:**
1. Select tree (from saved trees or enter address)
2. Enter NFT name
3. Provide description
4. Choose asset type (image/video/audio/3D)
5. Upload asset file
6. Add attributes (optional)
7. Specify Core collection (optional)
8. Set royalties
9. Review and create

### With Specific Tree

```bash
# By tree name
mplx bg nft create my-tree --wizard

# By tree address
mplx bg nft create BjgAh5ig1LTKbTCwA4rieiNpKQVjEzw9KVLnCptPWsKu --wizard
```

## Manual Creation

### With Pre-Uploaded Metadata

```bash
mplx bg nft create <tree> \
  --name "My Compressed NFT" \
  --uri "https://example.com/metadata.json"
```

**Requirements:**
- Metadata JSON must be publicly accessible
- Must follow Metaplex metadata standard

### With Local Files

```bash
mplx bg nft create <tree> \
  --name "My NFT" \
  --image ./image.png \
  --json ./metadata.json
```

**Process:**
1. Uploads image to storage provider
2. Reads metadata from JSON file
3. Updates image URI in metadata
4. Uploads updated metadata
5. Mints NFT with new URI

### With Individual Fields

```bash
mplx bg nft create <tree> \
  --name "My NFT" \
  --symbol "CNFT" \
  --image ./image.png \
  --description "A compressed NFT" \
  --royalties 5 \
  --collection <coreCollectionId>
```

**Process:**
1. Uploads image
2. Creates metadata JSON
3. Uploads metadata
4. Mints NFT

## Command Flags

### Required

- `--name <string>` - NFT name

### Asset Options (choose one)

- `--uri <url>` - Pre-uploaded metadata URI
- `--json <path>` + `--image <path>` - Local metadata + image
- `--image <path>` - Local image (generates metadata)

### Metadata Fields

- `--symbol <string>` - NFT symbol
- `--description <string>` - NFT description
- `--project-url <url>` - External URL
- `--attributes <json>` - Trait attributes as JSON array

Example attributes:
```bash
--attributes '[{"trait_type":"Background","value":"Blue"},{"trait_type":"Eyes","value":"Green"}]'
```

### Advanced Options

- `--animation <path>` - Animation file (video/audio/3D)
- `--royalties <number>` - Royalty percentage (0-100)
- `--collection <address>` - Metaplex Core collection ID
- `--owner <address>` - Recipient address (default: your wallet)

## Supported Asset Types

### Images

- **Formats:** PNG, JPG, JPEG, GIF, WebP, SVG
- **Recommended:** PNG or JPG for best compatibility
- **Max size:** Depends on storage provider

```bash
mplx bg nft create <tree> --name "My NFT" --image ./nft.png
```

### Videos

- **Formats:** MP4, MOV, WebM
- **Use:** Animation or primary asset
- **Flag:** `--image` for primary, `--animation` for supplemental

```bash
# Video as primary asset
mplx bg nft create <tree> --name "Video NFT" --image ./video.mp4

# Image with video animation
mplx bg nft create <tree> \
  --name "Animated NFT" \
  --image ./thumbnail.png \
  --animation ./animation.mp4
```

### Audio

- **Formats:** MP3, WAV, FLAC
- **Use:** Music NFTs

```bash
mplx bg nft create <tree> \
  --name "Music NFT" \
  --image ./cover-art.png \
  --animation ./song.mp3
```

### 3D Models

- **Formats:** GLB, GLTF
- **Use:** 3D art, metaverse assets

```bash
mplx bg nft create <tree> \
  --name "3D Model" \
  --image ./preview.png \
  --animation ./model.glb
```

## Core Collection Integration

### Creating with Collection

```bash
# First, create Core collection
mplx core collection create --wizard
# Save the collection ID

# Then create NFTs with collection
mplx bg nft create <tree> \
  --wizard \
  --collection <coreCollectionId>
```

### Collection Validation

The CLI automatically:
1. Validates collection exists
2. Verifies it's a Metaplex Core collection
3. Links NFT to collection

**Error if Token Metadata collection:**
```
Error: This is not a valid Metaplex Core collection
Tip: Create a Core collection with: mplx core collection create --wizard
```

### Benefits of Collections

- Grouped NFTs in marketplaces
- Collection-level royalties
- Collection authority can update all NFTs
- Better discoverability

## Examples

### Simple Image NFT

```bash
mplx bg nft create my-tree \
  --name "Pixel Art #1" \
  --image ./pixel-art.png \
  --description "A unique pixel art NFT"
```

### NFT with Attributes

```bash
mplx bg nft create my-tree \
  --name "Character #42" \
  --image ./character.png \
  --description "Rare character with blue background" \
  --attributes '[
    {"trait_type":"Background","value":"Blue"},
    {"trait_type":"Rarity","value":"Rare"},
    {"trait_type":"Level","value":"42"}
  ]'
```

### NFT in Collection with Royalties

```bash
mplx bg nft create my-tree \
  --name "Collection Item #1" \
  --image ./item1.png \
  --collection Abc123... \
  --royalties 5 \
  --description "Part of the main collection"
```

### Music NFT

```bash
mplx bg nft create my-tree \
  --name "Track #1" \
  --image ./album-cover.png \
  --animation ./track1.mp3 \
  --description "First track from the album" \
  --project-url "https://artist.com"
```

### Video NFT

```bash
mplx bg nft create my-tree \
  --name "Short Film" \
  --image ./poster.png \
  --animation ./film.mp4 \
  --description "A compressed video NFT"
```

### 3D Model NFT

```bash
mplx bg nft create my-tree \
  --name "3D Avatar" \
  --image ./preview.png \
  --animation ./avatar.glb \
  --description "Metaverse-ready 3D avatar"
```

### Mint to Different Owner

```bash
mplx bg nft create my-tree \
  --name "Gift NFT" \
  --image ./gift.png \
  --owner <recipientAddress>
```

## Bulk Creation

### Simple Loop

```bash
#!/bin/bash
TREE="my-tree"

for i in {1..100}; do
  mplx bg nft create $TREE \
    --name "NFT #$i" \
    --image "./images/nft$i.png" \
    --description "NFT number $i"
done
```

### With Attributes

```bash
#!/bin/bash
TREE="my-tree"
COLLECTION="Abc123..."

for i in {1..100}; do
  mplx bg nft create $TREE \
    --name "Character #$i" \
    --image "./images/$i.png" \
    --collection $COLLECTION \
    --royalties 5 \
    --attributes "[{\"trait_type\":\"Number\",\"value\":\"$i\"}]"
done
```

## Asset ID

After minting, you receive an **Asset ID**:

```
Asset ID: B85zgpJnegSbFck28ddnLg4d9HH2g4ZpnL2qrK9oMBdj
```

**Asset ID = PDA derived from:**
- Tree address
- Leaf index

**Use Asset ID for:**
- Fetching NFT data
- Updating metadata
- Transferring ownership
- Burning NFT

## Output

### Standard Output

```
--------------------------------
Compressed NFT Created!

Name: My NFT
Asset ID: B85zgpJnegSbFck28ddnLg4d9HH2g4ZpnL2qrK9oMBdj
Owner: A37BMLuGtSNkjheuJWmfRrYDEerdctbsGLe43Luz6sVG
Tree: BjgAh5ig1LTKbTCwA4rieiNpKQVjEzw9KVLnCptPWsKu

Signature: 5J7zKX9...
Explorer: https://explorer.solana.com/tx/5J7zKX9...
--------------------------------
```

### JSON Output

```bash
mplx bg nft create <tree> --name "My NFT" --uri "..." --json
```

```json
{
  "signature": "5J7zKX9...",
  "explorer": "https://explorer.solana.com/tx/5J7zKX9...",
  "assetId": "B85zgpJnegSbFck28ddnLg4d9HH2g4ZpnL2qrK9oMBdj",
  "owner": "A37BMLuGtSNkjheuJWmfRrYDEerdctbsGLe43Luz6sVG",
  "tree": "BjgAh5ig1LTKbTCwA4rieiNpKQVjEzw9KVLnCptPWsKu"
}
```

## Troubleshooting

### "No saved trees found"

```bash
# Create tree first
mplx bg tree create --wizard

# Or use address directly
mplx bg nft create <treeAddress> --wizard
```

### "Invalid Core collection"

```bash
# Must be Core collection, not Token Metadata
mplx core collection create --wizard
```

### "Tree is full"

```bash
# Check capacity
mplx bg tree list

# Create new tree
mplx bg tree create --wizard
```

### "Upload failed"

```bash
# Check storage configuration
mplx config list

# Verify file exists
ls -lh ./image.png
```

## Next Steps

- [Fetch NFTs](./nft-fetch.md) - Retrieve NFT data
- [Update NFTs](./nft-update.md) - Modify metadata
- [Transfer NFTs](./nft-transfer.md) - Change ownership
