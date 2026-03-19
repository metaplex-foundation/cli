# Test Wallet Modes

The test suite runs in two wallet modes to verify all commands work with both normal keypairs and asset-signer wallets.

```bash
npm test                    # Both modes sequentially
npm run test:normal         # Normal wallet mode only
npm run test:asset-signer   # Asset-signer wallet mode only
```

In asset-signer mode, a root hook (`test/setup.asset-signer.ts`) creates a signing asset, funds its PDA, and writes a temporary config. `runCli` then uses `-c <config>` instead of `-k <keypair>`, so all transactions are wrapped in MPL Core `execute()`.

Infrastructure that can't be created via execute CPI (large account allocations) uses `runCliDirect`, which always uses the normal keypair.

## Test Coverage by Wallet Mode

**Legend:**
- **Y** = runs and passes
- **Skip** = skipped (CPI limitation or authority mismatch)
- **Pending** = pre-existing `describe.skip` (not related to asset-signer)

### Core Commands

| Test | Normal | Asset-Signer |
|---|---|---|
| core asset create (name/uri, collection, custom owner) | Y | Y |
| core asset transfer (standalone, collection, not-owner error) | Y | Y |
| core asset burn (standalone, collection) | Y | Y |
| core asset update | Y | Y |
| core collection create | Y | Y |
| core plugins (add/update on collection and asset) | Y | Y |
| core execute info (PDA address + balance) | Y | Y |

### Asset-Signer Specific

| Test | Normal | Asset-Signer |
|---|---|---|
| Separate fee payer via `-p` | Y | Y |
| Mint cNFT into public tree as PDA | Y | Y |

### Toolbox

| Test | Normal | Asset-Signer |
|---|---|---|
| sol balance (identity + specific address) | Y | Y |
| sol transfer | Y | Y |
| sol wrap | Y | Y |
| sol unwrap | Y | Y |
| token create | Y | Y |
| token mint | Y | Y |
| toolbox raw (execute + error) | Y | Y |

### Token Metadata

| Test | Normal | Asset-Signer |
|---|---|---|
| tm transfer (NFT + pNFT) | Y | Y |
| tm transfer validation errors | Y | Y |
| tm update validation errors | Y | Y |

### Bubblegum

| Test | Normal | Asset-Signer | Notes |
|---|---|---|---|
| bg tree create (8 tests) | Y | Y | Uses `runCliDirect` internally (CPI limitation) |
| bg collection create (9 tests) | Y | Y | No trees involved |
| bg nft create (9 tests) | Y | Skip | Tree authority mismatch — tree owned by wallet, PDA can't mint |
| bg integration (8 tests) | Y | Skip | Tree authority mismatch |
| bg nft burn | Pending | Pending | Pre-existing `describe.skip` |
| bg nft transfer | Pending | Pending | Pre-existing `describe.skip` |
| bg nft update | Pending | Pending | Pre-existing `describe.skip` |

### Candy Machine

| Test | Normal | Asset-Signer | Notes |
|---|---|---|---|
| cm create (3 on-chain tests) | Y | Skip | CM creation is CPI-incompatible (large account) |
| cm create hasGuards (5 unit tests) | Y | Y | Pure unit tests |
| cm full lifecycle (create → insert → withdraw) | Y | Skip | CM authority mismatch |
| cm insert | Y | Skip | CM authority mismatch |
| cm withdraw | Y | Skip | CM authority mismatch |
| cm guard parsing (5 unit tests) | Y | Y | Pure unit tests |

### Genesis

| Test | Normal | Asset-Signer | Notes |
|---|---|---|---|
| genesis create/fetch (7 tests) | Y | Y | Setup uses `runCliDirect` for SOL wrap |
| genesis integration (19 tests) | Y | Skip | Authority mismatch on deposits/finalize |
| genesis launch (12 tests) | Y | Y | Setup uses `runCliDirect` for SOL wrap |
| genesis presale (6 tests) | Y | Skip | Authority mismatch on deposits/claims |
| genesis withdraw (8 tests) | Y | Skip | Authority mismatch on deposits/withdrawals |

### Distribution

| Test | Normal | Asset-Signer | Notes |
|---|---|---|---|
| distro deposit (6 tests) | Y | Skip | Authority mismatch + token account mismatch |
| distro withdraw (8 tests) | Y | Skip | Authority mismatch + token account mismatch |

### Lib (Unit Tests)

| Test | Normal | Asset-Signer |
|---|---|---|
| deserializeInstruction roundtrip (6 tests) | Y | Y |

## Why Some Tests Skip in Asset-Signer Mode

### CPI Limitations
These operations allocate large accounts, which fails when wrapped in `execute()`:
- Merkle tree creation
- Candy machine creation

The `createBubblegumTree` helper and CM creation in test setup use `runCliDirect` to bypass this.

### Authority Mismatch
Resources created with `runCliDirect` (normal wallet) have the wallet as authority. In asset-signer mode, commands run as the PDA, which isn't the authority. This affects:
- bg nft minting (tree authority is wallet, not PDA)
- CM insert/withdraw (CM authority is wallet)
- Genesis deposits/finalize (genesis authority is wallet)
- Distro deposits/withdrawals (distro authority is wallet)

### What IS Tested in Asset-Signer Mode
The asset-signer specific test creates a **public tree** (anyone can mint) and verifies the PDA can mint a cNFT into it. This confirms bubblegum minting works through execute CPI when authority isn't an issue.
