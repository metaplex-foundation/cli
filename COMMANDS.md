# Command Output Guidelines

This document defines the standard output contract for all `mplx` CLI commands. All commands must follow these guidelines to ensure consistent behaviour when using `--json` mode (used by AI agents, scripts, and tooling).

## How OCLIF JSON Output Works

When `--json` is passed, OCLIF captures the **return value** of the `run()` method and serialises it to stdout as JSON. Human-readable output (spinners, `this.log()`, `this.logSuccess()`) is suppressed. This means **every command must return a plain, JSON-serialisable object** from `run()`.

## Standard Return Shapes

### Transaction Commands (`TransactionCommand`)

Any command that sends a blockchain transaction must return:

```typescript
{
  signature: string       // base58 transaction signature
  explorer: string        // explorer URL for the transaction
  // ...plus command-specific fields (asset, mint, collection, etc.)
}
```

**Example** — `core asset create`:
```json
{
  "asset": "ABC...XYZ",
  "signature": "5fg...hij",
  "explorer": "https://explorer.solana.com/tx/5fg...hij",
  "coreExplorer": "https://core.metaplex.com/explorer/ABC...XYZ"
}
```

**Example** — `core asset burn`:
```json
{
  "asset": "ABC...XYZ",
  "signature": "5fg...hij",
  "explorer": "https://explorer.solana.com/tx/5fg...hij"
}
```

**Example** — `toolbox sol transfer`:
```json
{
  "from": "ABC...XYZ",
  "to": "DEF...UVW",
  "amount": 1.5,
  "signature": "5fg...hij",
  "explorer": "https://explorer.solana.com/tx/5fg...hij"
}
```

### Read / Fetch Commands (`BaseCommand`)

Commands that only read data should return the data directly:

```typescript
{
  // the fetched data — no wrapper needed
}
```

**Example** — `core asset fetch`:
```json
{
  "publicKey": "ABC...XYZ",
  "name": "My NFT",
  "uri": "https://...",
  ...
}
```

### Config / Mutation Commands (no transaction)

Commands that modify local configuration should return what was changed:

```typescript
{
  // the created/updated resource fields
}
```

**Example** — `config rpcs add`:
```json
{
  "name": "devnet",
  "endpoint": "https://api.devnet.solana.com"
}
```

**Example** — `config wallets add`:
```json
{
  "name": "my-wallet",
  "address": "ABC...XYZ",
  "path": "/path/to/keypair.json"
}
```

### Utility Commands

Commands that compute a value should return that value:

**Example** — `toolbox rent`:
```json
{
  "bytes": 1024,
  "rentSol": 0.00713856,
  "rentLamports": 7138560
}
```

**Example** — `toolbox sol balance`:
```json
{
  "address": "ABC...XYZ",
  "balance": 1.5
}
```

**Example** — `toolbox sol airdrop`:
```json
{
  "address": "ABC...XYZ",
  "amount": 1
}
```

---

## Rules

1. **Every `run()` must return an object**, never `undefined`, `void`, or a plain string.
2. **Transaction commands always include `signature` and `explorer`** in the return value.
3. **No console.log() in commands** — use `this.log()` or `this.logSuccess()` for human output.
4. **`static enableJsonFlag = true`** must be set on every command class (inherited from `BaseCommand` / `TransactionCommand`, but must be explicit on commands that extend `Command` directly).
5. **Spinners and human-readable output are fine** — OCLIF suppresses them automatically in `--json` mode.
6. **Return plain primitives only** — strings, numbers, booleans, plain objects, arrays. No `PublicKey` instances or `Uint8Array` — convert with `.toString()` / `txSignatureToString()`.

---

## Checklist for New Commands

- [ ] Extends `BaseCommand` or `TransactionCommand` (not raw `Command`)
- [ ] `run()` returns a typed, JSON-serialisable object
- [ ] Transaction commands include `signature` and `explorer` in the return
- [ ] No raw `console.log()` calls (use `this.log()`)
- [ ] Human-readable output uses `this.log()` / `this.logSuccess()` so it is suppressed in `--json` mode
