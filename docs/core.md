# Core Commands

The `core` commands provide functionality for managing Metaplex Core assets, collections, and plugins. These commands allow you to create, modify, and manage digital assets on the Solana blockchain using the Metaplex Core protocol.

## Command Structure

```bash
mplx core <command> <subcommand> [options]
```

## Available Commands

### Asset Commands

Commands for managing individual digital assets:

```bash
# Create a new asset
mplx core asset create [options]
  --name <name>           # Asset name
  --uri <uri>            # URI of the Asset metadata
  --collection <id>      # Collection ID (optional)
  --files                # Upload files mode
  --image <path>         # Path to image file (with --files)
  --json <path>         # Path to JSON metadata file (with --files)
  --directory <path>    # Create multiple assets from a directory
  --plugins <path>      # Path to plugin configuration file

# Burn an asset
mplx core asset burn <assetId> [options]
  --collection <id>      # Collection ID (optional)
  --list <path>         # Path to JSON file containing list of assets to burn

# Examples:
mplx core asset create --name "My Asset" --uri "https://example.com/metadata.json"
mplx core asset create --files --image ./asset/image.png --json ./asset/metadata.json
mplx core asset create --directory ./assets
mplx core asset burn <assetId>
```

### Collection Commands

Commands for managing collections of assets:

```bash
# Create a new collection
mplx core collection create [options]
  --name <name>         # Collection name
  --uri <uri>          # URI of the collection metadata
  --symbol <symbol>    # Collection symbol
  --files              # Upload files mode
  --image <path>       # Path to image file (with --files)
  --json <path>       # Path to JSON metadata file (with --files)
```

### Plugin Commands

Commands for managing asset and collection plugins:

```bash
# Add a plugin
mplx core plugins add <assetId/collectionId> [options]
  --wizard            # Use interactive wizard mode
  <json>             # Path to plugin configuration file

# Remove a plugin
mplx core plugins remove <assetId/collectionId> [options]
  --wizard           # Use interactive wizard mode

# Available Plugin Types:
- Royalties
- FreezeDelegate
- BurnDelegate
- TransferDelegate
- UpdateDelegate
- PermanentFreezeDelegate
- Attributes
- PermanentTransferDelegate
- PermanentBurnDelegate
- MasterEdition
- Edition
- Autograph
```

## Working with Files

### Directory Structure for Batch Operations (Coming Soon!)

When using the `--directory` flag for creating multiple assets, the directory should be structured as follows:

```
assets/
├── 0.png           # Image files
├── 0.json          # Metadata files
├── 0-plugins.json  # Optional individual plugin configuration
├── 1.png
├── 1.json
├── 1-plugins.json
└── plugins.json    # Optional global plugin configuration
```

### Metadata JSON Format

```json
{
  "name": "Asset Name",
  "symbol": "SYMBOL",
  "description": "Asset description",
  "image": "https://example.com/image.png",
  "attributes": [
    {
      "trait_type": "Property",
      "value": "Value"
    }
  ]
}
```

### Plugin Configuration Format

```json
{
  "royalties": {
    "type": "Royalties",
    "basisPoints": 500,
    "creators": [
      {
        "address": "...",
        "share": 100
      }
    ]
  }
}
```

## Error Handling

- Commands will display clear error messages when required parameters are missing
- Transaction errors will show relevant Solana error codes and messages
- File-related operations will validate file existence and format before proceeding

## Best Practices

1. Always verify asset and collection IDs before operations
2. Use the `--wizard` flag for guided plugin configuration
3. Back up metadata and plugin configurations before making changes
4. Test operations on devnet before mainnet deployment
5. Monitor transaction status and explorer links provided in command output
