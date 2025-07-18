# Candy Machine Commands

The `cm` (candy machine) commands provide functionality for creating, managing, and deploying MPL Core Candy Machines on the Solana blockchain. These commands allow you to create NFT collections with configurable minting rules, upload assets, and manage the entire candy machine lifecycle.

## Command Structure

```bash
mplx cm <command> [options]
```

## Candy Machine Asset Directory

All candy machine commands work from a **candy machine asset directory** that contains the necessary folders and files for your candy machine project. This directory structure is created when you use the wizard or can be set up manually.

### Standard Directory Structure

```text
candy-machine-name/
├── assets/
│   ├── 0.png              # Image files (PNG, JPG)
│   ├── 0.json             # Metadata files
│   ├── 1.png
│   ├── 1.json
│   ├── ...
│   ├── collection.png      # Collection image (optional)
│   └── collection.json     # Collection metadata (optional)
├── asset-cache.json        # Asset upload cache (generated)
└── cm-config.json          # Candy machine configuration (generated)
```

### Directory Components

- **`assets/`** - Contains all your NFT assets and metadata
  - Image files: `0.png`, `1.png`, `2.png`, etc.
  - Metadata files: `0.json`, `1.json`, `2.json`, etc.
  - Collection files: `collection.png`, `collection.json` (optional)

- **`asset-cache.json`** - Generated file containing upload URIs and asset information
- **`cm-config.json`** - Generated file containing candy machine configuration and guard settings

## Available Commands

### Create Candy Machine

Creates a new MPL Core Candy Machine with configurable settings and asset uploads.

```bash
# Create using interactive wizard (recommended for beginners)
mplx cm create --wizard

# Create directory template
mplx cm create --template

# Create using manual configuration (advanced)
# Requires manually created cm-config.json file
mplx cm create
```

#### Interactive Wizard Mode (Recommended)

The enhanced wizard provides a guided, user-friendly experience with comprehensive validation and progress tracking:

1. **Project Setup**
   - Directory name validation (letters, numbers, underscores, hyphens only)
   - Existing directory confirmation with file count
   - Asset folder preparation guidance

2. **Asset Discovery & Validation**
   - Automatic detection of JSON, image, and collection files
   - Detailed asset validation with actionable error messages
   - Missing file summaries with counts
   - Option to abort at any time with 'q'

3. **Collection Configuration**
   - Automatic collection name extraction from collection.json
   - Collection image detection and validation
   - Option to use existing collection with address validation
   - Robust error handling for invalid collection addresses

4. **Candy Machine Settings**
   - NFT mutability configuration
   - Global guards setup with comprehensive guard selection
   - Guard groups creation for different minting phases
   - Warning if no guards or groups are configured

5. **Asset Upload & Processing**
   - Intelligent asset cache management (reuse existing uploads)
   - Detailed progress indicators for image and metadata uploads
   - Upload validation and error handling
   - Collection creation (if needed)

6. **Candy Machine Creation**
   - On-chain candy machine deployment
   - Transaction confirmation and status tracking

7. **Item Insertion**
   - Smart insertion logic (skips already loaded items)
   - Option to reload items if cache shows them as loaded
   - Detailed transaction progress with sending and confirmation phases
   - Asset cache updates with loaded status

8. **Completion Summary**
   - Comprehensive setup summary
   - Directory, asset counts, collection info, and guard configuration
   - Success confirmation with candy machine ID

**Key Features:**
- **Abort Support**: Type 'q' at any prompt to quit gracefully
- **File Overwrite Protection**: Confirms before overwriting existing files
- **Progress Tracking**: Real-time progress indicators for all operations
- **Error Recovery**: Detailed error messages with actionable guidance
- **Cache Intelligence**: Reuses existing uploads when possible
- **Validation**: Comprehensive asset and configuration validation

#### Manual Configuration Mode (Advanced)

For advanced users, you can create a candy machine without the wizard by:

1. **Manually create `cm-config.json`** with the required configuration
2. **Prepare assets** in the correct directory structure
3. **Run individual commands** in the appropriate order

### Upload Assets

Uploads assets to decentralized storage and outputs a `asset-cache.json` file.

```bash
# Upload assets from current candy machine directory
mplx cm upload

# Upload assets from specific candy machine directory
mplx cm upload <directory>
```

**Features:**
- **Intelligent Caching**: Reuses existing uploads when possible
- **Progress Tracking**: Detailed progress indicators for image and metadata uploads
- **Validation**: Comprehensive upload validation
- **Error Handling**: Robust error recovery and reporting

**Requirements:**
- Must be run from a candy machine asset directory
- `assets/` directory with image and JSON files
- Valid asset naming (incremental: 0.png, 1.png, etc.)

### Insert Items

Inserts uploaded assets into a candy machine.

```bash
# Insert items from current candy machine directory
mplx cm insert

# Insert items from specific candy machine directory
mplx cm insert <directory>
```

**Features:**
- **Smart Loading**: Automatically detects already loaded items
- **Reload Option**: Prompts to reload items if cache shows them as loaded
- **Progress Tracking**: Detailed transaction progress with sending and confirmation phases
- **Batch Processing**: Efficiently processes items in optimal batch sizes

**Requirements:**
- Must be run from a candy machine asset directory
- `asset-cache.json` with valid URIs
- `cm-config.json` with candy machine ID
- Candy machine must be created and deployed

### Validate Cache

Validates the asset cache file to ensure all assets are properly uploaded.

```bash
# Validate cache in current candy machine directory
mplx cm validate

# Validate specific cache file
mplx cm validate <path_to_asset_cache>
```

## Workflow Options

### Option 1: Wizard Mode (Recommended for Beginners)

The wizard handles everything automatically in the correct order:

```bash
mplx cm create --wizard
```

This single command:
1. Creates the candy machine asset directory structure
2. Validates all assets and configuration
3. Uploads all assets with progress tracking
4. Creates the candy machine on-chain
5. Inserts all items with transaction progress
6. Provides a comprehensive completion summary

### Option 2: Manual Mode (Advanced Users)

For advanced users who want full control, you can run commands individually:

#### Step 1: Prepare Configuration and Assets

1. **Create a candy machine asset directory** with the proper structure
2. **Create `cm-config.json`** manually with your desired configuration
3. **Prepare assets** in the `assets/` directory with proper naming

#### Step 2: Upload Assets —Optional— can be done before or after create

```bash
# Navigate to your candy machine directory
cd ./my-candy-machine

# Upload assets
mplx cm upload
```

This creates/updates the `asset-cache.json` with upload URIs.

#### Step 3: Create Candy Machine

```bash
# From your candy machine directory
mplx cm create
```

This creates the candy machine on-chain using the configuration.

#### Step 4: Validate Uploads (Optional)

```bash
# From your candy machine directory
mplx cm validate
```

#### Step 5: Insert Items

```bash
# From your candy machine directory
mplx cm insert
```

**Important Order Notes:**
- **`create` and `upload` can be done in any order** - you can upload assets first to create the asset cache, then create the candy machine, or vice versa
- **`insert` must come after both `create` and `upload`** - you need both a created candy machine and uploaded assets before inserting
- **`validate` can be run at any time** to check the asset cache

## File Formats

### Metadata JSON Format

```json
{
  "name": "Asset Name",
  "symbol": "SYMBOL",
  "description": "Asset description",
  "image": "https://example.com/image.png",
  "attributes": [
    {
      "trait_type": "Background",
      "value": "Blue"
    },
    {
      "trait_type": "Eyes",
      "value": "Green"
    }
  ],
  "properties": {
    "files": [
      {
        "type": "image/png",
        "uri": "https://example.com/image.png"
      }
    ]
  }
}
```

### Collection Metadata Format

```json
{
  "name": "My NFT Collection",
  "symbol": "MNFT",
  "description": "A collection of unique digital assets",
  "image": "https://example.com/collection.png",
  "properties": {
    "files": [
      {
        "type": "image/png",
        "uri": "https://example.com/collection.png"
      }
    ]
  }
}
```

**Important:** The collection name is automatically extracted from the `name` field in `collection.json`.

### Asset Cache Format

```json
{
  "candyMachineId": "CandyMachinePublicKey...",
  "collection": "CollectionPublicKey...",
  "assetItems": {
    "0": {
      "name": "Asset 0",
      "image": "0.png",
      "imageUri": "https://gateway.irys.xyz/...",
      "imageType": "image/png",
      "json": "0.json",
      "jsonUri": "https://gateway.irys.xyz/...",
      "loaded": false
    }
  }
}
```

### Candy Machine Config Format

```json
{
  "name": "My Candy Machine",
  "candyMachineId": "CandyMachinePublicKey...",
  "config": {
    "collection": "CollectionPublicKey...",
    "itemsAvailable": 100,
    "isMutable": true,
    "isSequential": false,
    "guardConfig": {
      "mintLimit": {
        "id": 1,
        "limit": 1
      },
      "solPayment": {
        "lamports": 1000000000,
        "destination": "111111111111111111111111111111111"
      }
    },
    "groups": [
      {
        "label": "wl",
        "guards": {
          "allowList": {
            "merkleRoot": "MerkleRootHash..."
          }
        }
      }
    ]
  }
}
```

## Guard Configuration

Candy machines support various guard types for controlling minting behavior. Guards can be applied globally to the entire candy machine or to specific groups for different minting phases.

### Guard Types

For detailed information about all available guards and their configurations, see [Guard Documentation](./guards.md).

**Common Guards:**
- **Mint Limit**: Limit mints per wallet
- **Sol Payment**: Require SOL payment
- **Token Payment**: Require token payment
- **Start Date**: Set mint start time
- **End Date**: Set mint end time
- **Allow List**: Restrict to specific wallets
- **Freeze Sol Payment**: Freeze SOL for payment
- **Freeze Token Payment**: Freeze tokens for payment

### Guard Groups

Guard groups allow you to create different minting phases with distinct rules and restrictions. Each group can have its own set of guards, enabling complex minting strategies like whitelist phases, public sales, and exclusive drops.

For comprehensive information about guard groups, see [Guard Groups Documentation](./groups.md).

**Example Group Configuration:**
```json
{
  "groups": [
    {
      "label": "wl",
      "guards": {
        "allowList": {
          "merkleRoot": "MerkleRootHash..."
        },
        "solPayment": {
          "lamports": 500000000,
          "destination": "111111111111111111111111111111111"
        }
      }
    },
    {
      "label": "public",
      "guards": {
        "solPayment": {
          "lamports": 1000000000,
          "destination": "111111111111111111111111111111111"
        }
      }
    }
  ]
}
```

**Important:** Group labels are limited to **6 characters maximum**.

## Workflow Examples

### Complete Wizard Workflow (Recommended)

```bash
# Single command handles everything with enhanced user experience
mplx cm create --wizard
```

**Example Output:**
```text
--------------------------------
    
    Welcome to the Candy Machine Creator Wizard!

    This wizard will guide you through the process of creating a new candy machine.                
                
--------------------------------
✔ Directory name for your Candy Machine project? candy1
✔ Directory "candy1" already exists and contains 3 files. Type 'y' to use, 'n' to abort, or 'q' to quit: y
✔ Move your assets to the assets folder and press enter to continue, or type q to abort 
📁 Asset Discovery:
✔ Found 100 JSON files
✔ Found 100 image files
✔ Found collection metadata
✔ Found collection image
✔ Should the NFTs be mutable? (y/n or q to quit) y
✔ Do you want to create global guards? (y/n or q to quit) n
✔ Do you want to create guard groups for minting? (y/n or q to quit) n
⚠️  Warning: You have not set any global guards or guard groups. This may result in a non-functional candy machine. Consider adding at least one guard or group.

Configuration saved to: /path/to/candy1/cm-config.json
📁 Using existing asset cache (100 items already uploaded)
✔ Upload validation completed
✔ Collection image uploaded
✔ Collection metadata uploaded
✔ Collection created
⠦ Creating candy machine
Tx confirmed
✔ Candy machine created - HVgv54E36CRxGZoq9TCWafTV6WA1tMX33rNXrBX3wW9
✔ Sent 13 transactions
✔ Confirmed 13 transactions

🎉 Wizard complete! Here is a summary of your setup:
- Directory: candy1
- Assets: 100 JSON, 100 images, 0 animations
- Collection: Collection
- Collection ID: 5hJkVr6ETbPdtxmv8LfcUt1eumvSuWVZPRqqNS6byNYh
🎉 Candy machine created successfully!
```

### Manual Workflow Examples

#### Option A: Upload First, Then Create

```bash
# 1. Prepare candy machine asset directory with assets and config
# (manually create cm-config.json and assets/)

# 2. Navigate to candy machine directory
cd ./my-candy-machine

# 3. Upload assets first
mplx cm upload

# 4. Create candy machine
mplx cm create

# 5. Insert items
mplx cm insert

# 6. Validate (optional)
mplx cm validate
```

#### Option B: Create First, Then Upload

```bash
# 1. Prepare candy machine asset directory with assets and config
# (manually create cm-config.json and assets/)

# 2. Navigate to candy machine directory
cd ./my-candy-machine

# 3. Create candy machine first
mplx cm create

# 4. Upload assets
mplx cm upload

# 5. Insert items
mplx cm insert

# 6. Validate (optional)
mplx cm validate
```

### Batch Asset Upload

```bash
# Prepare candy machine asset directory structure
my-collection/
├── assets/
│   ├── 0.png
│   ├── 0.json
│   ├── 1.png
│   ├── 1.json
│   └── ...

# Navigate to directory and upload all assets
cd ./my-collection
mplx cm upload
```

### Validation and Troubleshooting

```bash
# From candy machine directory, check if assets are properly uploaded
mplx cm validate

# Or check specific cache file
mplx cm validate ./path/to/asset-cache.json
```

## Best Practices

1. **Directory Organization**
   - Keep each candy machine in its own directory
   - Use descriptive directory names
   - Maintain consistent asset naming (0.png, 1.png, etc.)
   - Back up your candy machine directories

2. **Asset Preparation**
   - Use consistent naming (0.png, 1.png, etc.)
   - Ensure metadata JSON files match image files
   - Validate image formats (PNG, JPG supported)
   - Keep file sizes reasonable (< 10MB recommended)
   - Include collection.json with a valid "name" field

3. **Candy Machine Configuration**
   - Test on devnet before mainnet
   - Use the wizard for guided configuration
   - Back up configuration files
   - Document guard settings
   - Consider adding at least one guard or guard group

4. **Asset Upload**
   - Upload assets before creating candy machine
   - Validate uploads before proceeding
   - Keep asset cache files for reference
   - Monitor upload progress
   - Reuse existing uploads when possible

5. **Deployment**
   - Verify candy machine creation
   - Test minting functionality
   - Monitor transaction status
   - Keep explorer links for verification
   - Check item insertion status

6. **User Experience**
   - Use the wizard for the best experience
   - Take advantage of abort functionality ('q' to quit)
   - Monitor progress indicators
   - Read validation messages carefully
   - Use existing asset caches when available

## Error Handling

Common issues and solutions:

- **Not in Candy Machine Directory**: Ensure you're in a directory with `assets/` folder and configuration files
- **Asset Cache Not Found**: Run upload command first or check directory structure
- **Missing Candy Machine ID**: Run the create command first or check config files
- **Upload Failures**: Check network connectivity and file formats
- **Validation Errors**: Verify asset naming and metadata format
- **Transaction Failures**: Check wallet balance and network status
- **Collection Name Missing**: Ensure collection.json has a valid "name" field
- **All Items Already Loaded**: Use the reload option in the insert command
- **Directory Already Exists**: Confirm overwrite or choose a different name

## Related Documentation

- [Guard Documentation](./guards.md) - Complete guide to all available guards and their configurations
- [Guard Groups Documentation](./groups.md) - How to create and manage guard groups for different minting phases

## Additional Resources

- [Metaplex Documentation](https://developers.metaplex.com)
- [MPL Core Candy Machine](https://docs.metaplex.com/programs/candy-machine/)
- [Solana Documentation](https://docs.solana.com)
- [Discord Support](https://discord.gg/metaplex)
