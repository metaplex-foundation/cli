# Bubblegum Command Tests

This directory contains tests for the Bubblegum (compressed NFT) commands.

## Test Coverage

### ✅ Fully Tested Commands

#### `bg collection create`
- **File**: `bg.collection.create.test.ts`
- **Coverage**: Complete
- **Tests**:
  - Collection creation with BubblegumV2 plugin
  - Collections with royalties (0-100%)
  - Output validation
  - Usage instructions
  - Multiple collections
  - Required flag validation
- **Note**: This command creates Core collections with the Bubblegum V2 plugin automatically, making them ready for compressed NFTs

#### `bg tree create`
- **File**: `bg.tree.create.test.ts`
- **Coverage**: Complete
- **Tests**:
  - Basic tree creation with default configuration
  - Custom depth, buffer size, and canopy depth
  - Public tree creation
  - Named tree storage
  - Configuration validation
  - Explorer link generation
  - Duplicate name prevention

#### `bg nft create`
- **File**: `bg.nft.create.test.ts`
- **Coverage**: Complete (using `--name` and `--uri` flags only)
- **Tests**:
  - Basic NFT creation with name and URI
  - NFT with royalties (0%, 5%, 100%)
  - NFT with symbol
  - NFT in a Core collection
  - Multiple NFTs in same tree
  - All optional parameters combined
- **Limitations**: Cannot test file upload flows (`--image`, `--json`, `--animation`) due to lack of local storage testing

#### Integration Tests
- **File**: `bg.integration.test.ts`
- **Coverage**: Complete workflows
- **Tests**:
  - Complete workflow: tree → collection → NFT
  - Multiple trees with different configurations
  - NFTs across different trees
  - Public tree workflows
  - Collections with multiple NFTs
  - Various royalty percentages (0-100%)
  - Various symbols

### ⏭️ Skipped Commands (DAS Dependency)

The following commands are **skipped** in local testing because they require the Digital Asset Standard (DAS) API to fetch asset and proof data:

#### `bg nft transfer`
- **File**: `bg.nft.transfer.test.ts`
- **Status**: `describe.skip`
- **Reason**: Requires `getAssetWithProof` which needs DAS API
- **Tests Defined**:
  - Transfer to new owner
  - Transfer details validation
  - Permission checks
- **To Enable**: Deploy to devnet/mainnet with DAS available, or mock `getAssetWithProof`

#### `bg nft burn`
- **File**: `bg.nft.burn.test.ts`
- **Status**: `describe.skip`
- **Reason**: Requires `getAssetWithProof` which needs DAS API
- **Tests Defined**:
  - Burn NFT
  - Burn details validation
  - Permission checks
  - Sequential burns
- **To Enable**: Deploy to devnet/mainnet with DAS available, or mock `getAssetWithProof`

#### `bg nft update`
- **File**: `bg.nft.update.test.ts`
- **Status**: `describe.skip`
- **Reason**: Requires both:
  1. `getAssetWithProof` (needs DAS API)
  2. `fetchJsonMetadata` (needs accessible metadata URIs)
- **Tests Defined**:
  - Update with new URI
  - Update with new name
  - Update details validation
  - Authority permission checks
  - Multiple property updates
- **To Enable**: Deploy to devnet/mainnet with DAS available and accessible metadata URIs, or mock both functions

## Running Tests

```bash
# Run all BG tests (skipped tests won't run)
npm test -- --grep "bg"

# Run only tree tests
npm test -- test/commands/bg/bg.tree.create.test.ts

# Run only NFT creation tests
npm test -- test/commands/bg/bg.nft.create.test.ts

# Run integration tests
npm test -- test/commands/bg/bg.integration.test.ts

# Run all tests including skipped ones (will still skip due to describe.skip)
npm test
```

## Prerequisites

To run these tests, you need:

1. **Local Validator**: Running on `http://127.0.0.1:8899`
   ```bash
   npm run validator
   ```

2. **Test Keypair**: Available at `test-files/key.json`

3. **SOL**: Tests automatically airdrop 100 SOL to the test account in `before` hooks

## Test Helpers

### `bghelpers.ts`

Provides utility functions for BG command testing:

- `createBubblegumTree()` - Creates a test tree with specified config
- `createCompressedNFT()` - Creates a test NFT using `--name` and `--uri`
- `extractTreeAddress()` - Extracts tree address from CLI output
- `extractAssetId()` - Extracts asset ID from CLI output
- `extractSignature()` - Extracts transaction signature from CLI output
- `stripAnsi()` - Removes ANSI color codes from output

## Limitations

### Local Testing Constraints

1. **No File Uploads**: Tests avoid file uploads by using `--name` and `--uri` flags
2. **No DAS API**: Cannot test commands that require fetching asset/proof data
3. **No Asset State Verification**: Tests verify transaction success, not final asset state
4. **Timing Delays**: Tests include `setTimeout` calls to allow transactions to settle

### What Can't Be Tested Locally

- File-based NFT creation (`--image`, `--json`, `--animation`)
- NFT transfers (requires DAS)
- NFT burns (requires DAS)
- NFT updates (requires DAS + metadata fetch)
- Asset state queries
- Proof verification

## Future Improvements

To enable full test coverage:

1. **Mock DAS API**: Create mocks for `getAssetWithProof`
2. **Mock Metadata Fetch**: Mock `fetchJsonMetadata` for update tests
3. **Local Storage Mock**: Mock file upload functionality
4. **Integration Environment**: Set up test environment with DAS API available

## Test Philosophy

These tests focus on:
- ✅ Command execution and argument parsing
- ✅ Transaction creation and submission
- ✅ Transaction signature verification
- ✅ Output format validation
- ✅ Error handling for invalid inputs
- ⏭️ Asset state verification (requires DAS)
- ⏭️ Proof validation (requires DAS)
