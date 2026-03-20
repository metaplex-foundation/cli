# Asset-Signer Wallets

Every MPL Core asset has a deterministic **signer PDA** that can hold SOL, tokens, and even own other assets. Asset-signer wallets let you use this PDA as your active wallet — all CLI commands automatically operate through the PDA.

## Quick Start

```bash
# 1. Create an asset (or use an existing one you own)
mplx core asset create --name "My Vault" --uri "https://example.com/vault"

# 2. Register it as a wallet (auto-detects the owner from on-chain data)
mplx config wallets add vault --asset <assetId>

# 3. Check the PDA info
mplx core asset execute info <assetId>

# 4. Fund the PDA
mplx toolbox sol transfer 0.1 <signerPdaAddress>

# 5. Switch to the asset-signer wallet
mplx config wallets set vault

# 6. Use any command as the PDA
mplx toolbox sol balance
mplx toolbox sol transfer 0.01 <destination>
mplx core asset create --name "PDA Created NFT" --uri "https://example.com/nft"
```

## How It Works

When an asset-signer wallet is active:

1. **`umi.identity`** is set to a noop signer with the PDA's public key — commands build instructions with the PDA as authority naturally
2. **`umi.payer`** is also set to the PDA noop signer — so derived addresses (ATAs, token accounts) resolve correctly
3. **At send time**, the transaction is wrapped in MPL Core's `execute` instruction, which signs on behalf of the PDA on-chain
4. **The real wallet** (asset owner) signs the outer transaction and pays fees via `setFeePayer`

## Wallet Management

### Adding an Asset-Signer Wallet

```bash
mplx config wallets add <name> --asset <assetId>
```

The CLI fetches the asset on-chain, determines the owner, and matches it against your saved wallets. If the owner isn't in your wallet list, you'll be prompted to add it first.

### Listing Wallets

```bash
mplx config wallets list
```

Asset-signer wallets show as `asset-signer` type with the PDA address and linked asset.

### Switching Wallets

```bash
# Switch to asset-signer
mplx config wallets set vault

# Switch back to normal
mplx config wallets set my-wallet
```

### Overriding with -k

Pass `-k` to bypass the asset-signer wallet for a single command:

```bash
# Uses the specified keypair directly, ignores asset-signer
mplx toolbox sol balance -k /path/to/wallet.json
```

## Separate Fee Payer

The on-chain `execute` instruction supports separate authority and fee payer accounts. Use `-p` to have a different wallet pay transaction fees while the asset owner signs the execute:

```bash
mplx toolbox sol transfer 0.01 <destination> -p /path/to/fee-payer.json
```

The asset owner still signs the `execute` instruction. The `-p` wallet only pays the transaction fee.

## Supported Commands

All CLI commands work with asset-signer wallets. The transaction wrapping happens transparently in the send layer.

### Fully Transparent (no special handling needed)

- **Core**: `asset create`, `asset transfer`, `asset burn`, `asset update`, `collection create`
- **Toolbox SOL**: `balance`, `transfer`, `wrap`, `unwrap`
- **Toolbox Token**: `transfer`, `create`, `mint`
- **Toolbox Raw**: `raw --instruction <base64>`
- **Token Metadata**: `transfer`, `create`, `update`
- **Bubblegum**: `nft create` (public trees), `nft transfer`, `nft burn`, `collection create`
- **Genesis**: `create`, `bucket add-*`, `deposit`, `withdraw`, `claim`, `finalize`, `revoke`
- **Distribution**: `create`, `deposit`, `withdraw`
- **Candy Machine**: `insert`, `withdraw`

### PDA Inspection

```bash
# Show the PDA address and SOL balance for any asset
mplx core asset execute info <assetId>
```

### Raw Instructions

```bash
# Execute arbitrary base64-encoded instructions as the current wallet
# When asset-signer is active, automatically wrapped in execute()
mplx toolbox raw --instruction <base64>
mplx toolbox raw --instruction <ix1> --instruction <ix2>
echo "<base64>" | mplx toolbox raw --stdin
```

## CPI Limitations

Some operations cannot be wrapped in `execute()` due to Solana CPI constraints:

- **Large account creation** — Merkle trees, candy machines (exceed CPI account allocation limits)
- **Native SOL wrapping** — `transferSol` to a token account fails in CPI context

For these operations, use a normal wallet or create the infrastructure first, then switch to the asset-signer wallet for subsequent operations.

## Building Raw Instructions

The CLI includes serialization helpers for building base64-encoded instructions:

```typescript
import { publicKey } from '@metaplex-foundation/umi'
import { serializeInstruction } from '@metaplex-foundation/cli/lib/execute/deserializeInstruction'

const signerPda = '<PDA address from execute info>'
const destination = '<destination address>'

// System Program SOL transfer
const data = new Uint8Array(12)
const view = new DataView(data.buffer)
view.setUint32(0, 2, true)             // Transfer discriminator
view.setBigUint64(4, 1_000_000n, true) // 0.001 SOL

const ix = {
  programId: publicKey('11111111111111111111111111111111'),
  keys: [
    { pubkey: publicKey(signerPda), isSigner: true, isWritable: true },
    { pubkey: publicKey(destination), isSigner: false, isWritable: true },
  ],
  data,
}

console.log(serializeInstruction(ix))
// Pass the output to: mplx toolbox raw --instruction <base64>
```

### Instruction Binary Format

| Bytes | Field |
|-------|-------|
| 32 | Program ID |
| 2 | Number of accounts (u16 little-endian) |
| 33 per account | 32 bytes pubkey + 1 byte flags (bit 0 = isSigner, bit 1 = isWritable) |
| remaining | Instruction data |
