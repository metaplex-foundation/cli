# Token Metadata Create Command

Create NFTs using the MPL Token Metadata program with support for both regular NFTs and Programmable NFTs (pNFTs).

## Usage

```bash
mplx tm create [FLAGS]
```

## Creation Methods

### 1. Interactive Wizard (Recommended)

Launch the interactive wizard for guided NFT creation:

```bash
mplx tm create --wizard
```

The wizard guides you through:
- Basic information (name, description, project URL)
- Media type selection and file paths
- Attribute creation with trait/value pairs
- Collection membership configuration
- Royalty percentage and enforcement settings

### 2. File-based Creation

Create an NFT using existing image and JSON metadata files:

```bash
mplx tm create --image "./my-nft.png" --json "./metadata.json"
```

**Process:**
1. Uploads your image file to storage
2. Reads your JSON metadata file
3. Updates JSON with uploaded image URI
4. Uploads updated metadata
5. Creates the NFT

### 3. URI Creation

Create an NFT using metadata that's already hosted online:

```bash
mplx tm create --name "My NFT" --uri "https://example.com/metadata.json"
```

**Use case:** When your metadata is already hosted and accessible.

### 4. Manual Creation

Build metadata from individual command-line flags:

```bash
mplx tm create \
  --name "My NFT" \
  --image "./nft.png" \
  --attributes "trait1:value1,trait2:value2" \
  --royalties 5
```

## Flags

### Core Flags

| Flag | Type | Description | Required |
|------|------|-------------|----------|
| `--wizard` | boolean | Launch interactive wizard | - |
| `--name` | string | NFT name | For manual/URI modes |
| `--uri` | string | Existing metadata URI | For URI mode |
| `--image` | string | Path to image file | For file/manual modes |
| `--json` | string | Path to JSON metadata file | For file mode |

### Metadata Flags (Manual Creation)

| Flag | Type | Description | Example |
|------|------|-------------|---------|
| `--description` | string | NFT description | `"An awesome NFT"` |
| `--attributes` | string | Trait/value pairs | `"color:blue,rarity:rare"` |
| `--project-url` | string | Project website URL | `"https://myproject.com"` |
| `--animation` | string | Animation/video file path | `"./animation.mp4"` |
| `--royalties` | integer | Royalty percentage (0-100) | `5` |

### Additional Flags

| Flag | Type | Description | Default |
|------|------|-------------|---------|
| `--collection` | string | Collection ID | None |
| `--pnft` | boolean | Create Programmable NFT | `true` |

## Examples

### Basic Examples

```bash
# Interactive wizard (best for beginners)
mplx tm create --wizard

# Use existing files
mplx tm create --image "./nft.png" --json "./metadata.json"

# Use online metadata
mplx tm create --name "My NFT" --uri "https://example.com/metadata.json"

# Simple manual creation
mplx tm create --name "Cool NFT" --image "./cool.png"
```

### Advanced Examples

```bash
# Full manual creation with all metadata
mplx tm create \
  --name "Epic Warrior #001" \
  --description "A legendary warrior from the ancient realm" \
  --image "./warrior.png" \
  --attributes "class:warrior,level:100,element:fire,rarity:legendary" \
  --project-url "https://epicwarriors.io" \
  --royalties 7 \
  --collection "EpicWarriorsCollectionAddress"

# Create regular NFT (non-programmable) with video
mplx tm create \
  --name "Music Video NFT" \
  --description "Exclusive music video content" \
  --image "./thumbnail.jpg" \
  --animation "./music-video.mp4" \
  --attributes "genre:electronic,duration:180,artist:DJCrypto" \
  --royalties 10 \
  --pnft false

# High-value collection item with premium royalties
mplx tm create \
  --name "Diamond Hand #1" \
  --image "./diamond-hand.png" \
  --attributes "tier:diamond,number:1,power:9999" \
  --royalties 15 \
  --collection "DiamondHandsCollection"
```

## Programmable NFTs vs Regular NFTs

### Programmable NFTs (`--pnft true` - Default)
- ✅ **Royalty Enforcement**: Can programmatically enforce royalty payments
- ✅ **Transfer Controls**: Support for custom transfer restrictions
- ✅ **Advanced Features**: Built for evolving NFT standards
- ✅ **Future-Proof**: Compatible with upcoming marketplace requirements

### Regular NFTs (`--pnft false`)
- ✅ **Universal Compatibility**: Works with all existing NFT infrastructure
- ✅ **Lower Complexity**: Traditional NFT behavior
- ⚠️ **Marketplace Dependent**: Royalty compliance relies on marketplace implementation

## Attributes Format

Attributes use comma-separated trait:value pairs:

```bash
--attributes "trait_type:value,trait_type:value"
```

**Examples:**
```bash
# Single attribute
--attributes "color:blue"

# Multiple attributes
--attributes "background:sunset,eyes:laser,hat:crown,rarity:rare"

# Numeric attributes
--attributes "strength:85,speed:92,level:50"
```

## Royalties

Specify royalty percentages as whole numbers (0-100):

- `--royalties 0` = No creator royalties
- `--royalties 5` = 5% creator royalties
- `--royalties 10` = 10% creator royalties

**Industry Standards:**
- Most NFT projects use 2.5% - 10% royalties
- Premium/utility projects may use up to 15%
- Consider your community and utility when setting royalties

## File Support

### Image Formats
- PNG (`.png`) - Recommended for digital art
- JPEG (`.jpg`, `.jpeg`) - Good for photographs
- GIF (`.gif`) - Animated images

### Animation Formats
- **Video**: MP4 (`.mp4`), WebM (`.webm`)
- **Audio**: MP3 (`.mp3`), WAV (`.wav`)
- **3D Models**: GLB (`.glb`), GLTF (`.gltf`)

## Output

Successful creation displays:

```
✔ Image uploaded to https://gateway.irys.xyz/...
✔ Metadata uploaded to https://gateway.irys.xyz/...
✔ NFT created successfully
--------------------------------
  NFT: Ekc2Zse2WdDMKKnJtzQeFUkbczCUHDZZhAotXTPXQ7J8
  Signature: QC3XU6TN4wwE4sA2tNqzRWXBrYSzNuqY1MdW1yMeoJAq...
  Explorer: https://explorer.solana.com/tx/...
--------------------------------
```

## Flag Combinations

### ✅ Valid Combinations

| Method | Required Flags | Optional Flags |
|--------|---------------|----------------|
| Wizard | `--wizard` | `--collection`, `--pnft` |
| File-based | `--image`, `--json` | `--collection`, `--pnft` |
| URI-based | `--name`, `--uri` | `--collection`, `--pnft`, `--royalties` |
| Manual | `--name`, `--image` | All metadata flags, additional flags |

### ❌ Invalid Combinations

- `--wizard` with any metadata flags
- `--uri` with metadata creation flags (`--description`, `--attributes`, etc.)
- `--json` with individual metadata flags
- Missing required flag combinations

## Error Handling

| Error | Solution |
|-------|----------|
| `Image file does not exist` | Verify file path exists and is accessible |
| `Invalid collection ID` | Check collection address format (base58) |
| `Royalty percentage must be between 0 and 100` | Use integers from 0-100 |
| `Missing required information` | Provide required flag combinations |
| `Invalid attributes format` | Use `trait:value,trait:value` format |

## Tips & Best Practices

1. **Start with wizard mode** if you're new to NFT creation
2. **Test on devnet first** before mainnet deployment
3. **Optimize images** for faster uploads and better user experience
4. **Use descriptive names** and comprehensive descriptions
5. **Consider royalty enforcement** - use pNFTs for guaranteed royalty collection
6. **Organize with collections** for related NFT series
7. **Validate metadata URLs** ensure they're accessible and permanent
8. **Use consistent attribute naming** across your collection

## Related Commands

- `mplx tm update` - Update existing NFT metadata (coming soon)
- `mplx tm transfer` - Transfer NFTs with controls (coming soon)
- `mplx core asset create` - Create Metaplex Core assets
- `mplx toolbox token create` - Create fungible tokens