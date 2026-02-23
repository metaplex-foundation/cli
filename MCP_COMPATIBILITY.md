# MCP Compatibility Tracker

Status tracking for making CLI commands compatible with MCP tool usage.

## Key Issues

### 1. `--json` returns `null` on most commands

Most commands extend `TransactionCommand`/`BaseCommand` which set `enableJsonFlag = true`, but `run()` returns `void`. This means `--json` outputs `{"result":null}` — useless for MCP tools that need to parse results.

**Fix:** Commands need to `return` structured data from `run()`.

### 2. Some commands are always interactive

Three commands have no non-interactive path and cannot be used by MCP at all.

### 3. Config commands extend plain `Command`

Config commands (rpcs, wallets, explorer, storage) extend `Command` directly instead of `BaseCommand`, so they lack `--json` support entirely.

---

## Command Status

### Legend

- **Ready**: Works with MCP as-is
- **Needs JSON Return**: Non-interactive but `--json` returns null (needs `run()` to return data)
- **Conditional**: Works only when specific flags/args are provided (avoid wizard/interactive flags)
- **Incompatible**: Always interactive, no bypass — needs a non-interactive path added
- **No --json**: Extends plain `Command`, no JSON output support

---

### Core Commands

| Command | Status | Interactive? | `--json` works? | Notes |
|---|---|---|---|---|
| `core asset create` | Conditional + Needs JSON Return | `--wizard`, `--plugins` are interactive | Returns asset address + sig | Avoid `--wizard`/`--plugins`; use `--name`/`--uri` |
| `core asset burn` | Needs JSON Return | No | Returns null | Should return signature |
| `core asset fetch` | Needs JSON Return | No | Returns null | Should return asset data |
| `core asset update` | Needs JSON Return | No | Returns null | Should return signature |
| `core asset template` | Needs JSON Return | No | Returns null | Should return file path |
| `core collection create` | Conditional + Needs JSON Return | `--wizard`, `--plugins` are interactive | Returns null | Should return collection address + sig |
| `core collection fetch` | Ready | No | Returns on-chain asset object | Best fetch command |
| `core collection template` | Needs JSON Return | No | Returns null | Should return file path |
| `core plugins add` | Conditional + Needs JSON Return | `--wizard` is interactive | Returns null | Use JSON file arg |
| `core plugins update` | Conditional + Needs JSON Return | `--wizard` is interactive | Returns null | Use JSON file arg |
| `core plugins generate` | **Incompatible** | Always interactive | Returns null | Needs non-interactive flag path |

### Config Commands

| Command | Status | Interactive? | `--json` works? | Notes |
|---|---|---|---|---|
| `config get` | No --json | No | No `--json` flag | `run()` returns ConfigJson but no flag to use it |
| `config set` | No --json | No | No `--json` flag | |
| `config rpcs add` | No --json | No | No `--json` flag | |
| `config rpcs list` | No --json | No | No `--json` flag | Uses `console.table()` |
| `config rpcs remove` | No --json | No | No `--json` flag | |
| `config rpcs set` | Conditional + No --json | Interactive if `name` arg omitted | No `--json` flag | Always provide `name` arg |
| `config wallets add` | No --json | No | No `--json` flag | |
| `config wallets list` | No --json | No | No `--json` flag | Uses `console.table()` |
| `config wallets new` | Needs JSON Return | No | Returns null | Should return keypair path + pubkey |
| `config wallets remove` | No --json | No | No `--json` flag | |
| `config wallets set` | Conditional + No --json | Interactive if `name` arg omitted | No `--json` flag | Always provide `name` arg |
| `config explorer set` | **Incompatible** | Always interactive | No `--json` flag | Needs `--explorer` arg |
| `config storage set` | **Incompatible** | Always interactive | No `--json` flag | Needs `--provider` arg |

### Toolbox - SOL Commands

| Command | Status | Interactive? | `--json` works? | Notes |
|---|---|---|---|---|
| `toolbox sol airdrop` | Needs JSON Return | No | Returns null | Should return signature + balance |
| `toolbox sol balance` | Needs JSON Return | No | Returns null | Should return balance value |
| `toolbox sol transfer` | Ready | No | Returns "success" | Could be improved to return sig |
| `toolbox sol wrap` | Ready | No | Returns "success" | |
| `toolbox sol unwrap` | Ready | No | Returns "success" | |

### Toolbox - Token Commands

| Command | Status | Interactive? | `--json` works? | Notes |
|---|---|---|---|---|
| `toolbox token create` | Conditional + Needs JSON Return | `--wizard` is interactive | Returns null | Should return mint address + sig |
| `toolbox token mint` | Ready | No | Returns tx result | Good |
| `toolbox token transfer` | Needs JSON Return | No | Returns null | Should return signature |
| `toolbox token update` | Conditional + Needs JSON Return | `--editor` is interactive | Returns null | Avoid `--editor` |
| `toolbox token add-metadata` | Needs JSON Return | No | Returns null | Should return signature |

### Toolbox - Storage Commands

| Command | Status | Interactive? | `--json` works? | Notes |
|---|---|---|---|---|
| `toolbox storage balance` | Needs JSON Return | No | Returns null | Logs JSON text but doesn't return it |
| `toolbox storage fund` | Needs JSON Return | No | Returns null | |
| `toolbox storage upload` | Needs JSON Return | No | Returns null | Should return URI |
| `toolbox storage withdraw` | Needs JSON Return | No | Returns null | |

### Toolbox - LUT Commands

| Command | Status | Interactive? | `--json` works? | Notes |
|---|---|---|---|---|
| `toolbox lut create` | Needs JSON Return | No | Returns null | Should return LUT address + sig |
| `toolbox lut fetch` | Ready (custom) | No | Custom `--json` flag | Has its own JSON output logic |
| `toolbox lut deactivate` | Needs JSON Return | No | Returns null | |
| `toolbox lut close` | Needs JSON Return | No | Returns null | |

### Toolbox - Template Commands

| Command | Status | Interactive? | `--json` works? | Notes |
|---|---|---|---|---|
| `toolbox template program` | Conditional + No --json | Interactive if `template` arg omitted | No `--json` flag | Always provide arg |
| `toolbox template website` | Conditional + No --json | Interactive if `--template` omitted | No `--json` flag | Always provide flag |

### Toolbox - Other

| Command | Status | Interactive? | `--json` works? | Notes |
|---|---|---|---|---|
| `toolbox rent` | Needs JSON Return | No | Returns null | Should return rent value |

### Genesis Commands

| Command | Status | Interactive? | `--json` works? | Notes |
|---|---|---|---|---|
| `genesis create` | Needs JSON Return | No | Returns null | Should return genesis address + sig |
| `genesis fetch` | Needs JSON Return | No | Returns null | Should return genesis data |
| `genesis deposit` | Needs JSON Return | No | Returns null | |
| `genesis withdraw` | Needs JSON Return | No | Returns null | |
| `genesis claim` | Needs JSON Return | No | Returns null | |
| `genesis claim-unlocked` | Needs JSON Return | No | Returns null | |
| `genesis finalize` | Needs JSON Return | No | Returns null | |
| `genesis revoke` | Needs JSON Return | No | Returns null | |
| `genesis transition` | Needs JSON Return | No | Returns null | |
| `genesis bucket add-launch-pool` | Needs JSON Return | No | Returns null | |
| `genesis bucket add-presale` | Needs JSON Return | No | Returns null | |
| `genesis bucket add-unlocked` | Needs JSON Return | No | Returns null | |
| `genesis bucket fetch` | Needs JSON Return | No | Returns null | Should return bucket data |
| `genesis presale claim` | Needs JSON Return | No | Returns null | |
| `genesis presale deposit` | Needs JSON Return | No | Returns null | |

---

## MCP-Only Tools (not CLI commands)

These should be implemented directly in the MCP server, not as OCLIF commands.

| Tool | Status | Description |
|---|---|---|
| `write_temp_file` | TODO | Accept base64 data, write to temp file, return path. Used for AI-generated images. |

---

## Priority Order

### P0 — Incompatible commands (need non-interactive paths)

1. `core plugins generate` — add `--plugin` and `--config` flags for non-interactive use
2. `config explorer set` — add positional arg or `--explorer` flag
3. `config storage set` — add positional arg or `--provider` flag

### P1 — High-value commands that need JSON returns

These are the commands MCP tools will use most frequently:

1. `core asset create` — return `{ asset, signature }`
2. `core collection create` — return `{ collection, signature }`
3. `core asset fetch` — return asset data
4. `toolbox token create` — return `{ mint, signature }`
5. `toolbox storage upload` — return `{ uri }` (critical for upload workflow)
6. `toolbox sol balance` — return `{ balance }`
7. `genesis create` — return `{ genesis, signature }`
8. `genesis fetch` — return genesis data

### P2 — Remaining commands that need JSON returns

All other "Needs JSON Return" commands above.

### P3 — Config commands (extend to BaseCommand or add --json)

Migrate config commands to `BaseCommand` or add `enableJsonFlag` manually.
