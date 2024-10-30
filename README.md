cli
=================

Metaplex universal CLI


[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/cli.svg)](https://npmjs.org/package/cli)
[![Downloads/week](https://img.shields.io/npm/dw/cli.svg)](https://npmjs.org/package/cli)


<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g @metaplex-foundation/cli
$ mplx COMMAND
running command...
$ mplx (--version)
@metaplex-foundation/cli/0.0.0 darwin-arm64 node-v20.18.0
$ mplx --help [COMMAND]
USAGE
  $ mplx COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`mplx autocomplete [SHELL]`](#mplx-autocomplete-shell)
* [`mplx commands`](#mplx-commands)
* [`mplx config`](#mplx-config)
* [`mplx config get KEY`](#mplx-config-get-key)
* [`mplx config set KEY VALUE`](#mplx-config-set-key-value)
* [`mplx create asset`](#mplx-create-asset)
* [`mplx create collection [FILE]`](#mplx-create-collection-file)
* [`mplx fetch asset ASSET`](#mplx-fetch-asset-asset)
* [`mplx help [COMMAND]`](#mplx-help-command)
* [`mplx version`](#mplx-version)

## `mplx autocomplete [SHELL]`

Display autocomplete installation instructions.

```
USAGE
  $ mplx autocomplete [SHELL] [-r]

ARGUMENTS
  SHELL  (zsh|bash|powershell) Shell type

FLAGS
  -r, --refresh-cache  Refresh cache (ignores displaying instructions)

DESCRIPTION
  Display autocomplete installation instructions.

EXAMPLES
  $ mplx autocomplete

  $ mplx autocomplete bash

  $ mplx autocomplete zsh

  $ mplx autocomplete powershell

  $ mplx autocomplete --refresh-cache
```

_See code: [@oclif/plugin-autocomplete](https://github.com/oclif/plugin-autocomplete/blob/v3.2.7/src/commands/autocomplete/index.ts)_

## `mplx commands`

List all mplx commands.

```
USAGE
  $ mplx commands [--json] [-c id|plugin|summary|type... | --tree] [--deprecated] [-x | ] [--hidden]
    [--no-truncate | ] [--sort id|plugin|summary|type | ]

FLAGS
  -c, --columns=<option>...  Only show provided columns (comma-separated).
                             <options: id|plugin|summary|type>
  -x, --extended             Show extra columns.
      --deprecated           Show deprecated commands.
      --hidden               Show hidden commands.
      --no-truncate          Do not truncate output.
      --sort=<option>        [default: id] Property to sort by.
                             <options: id|plugin|summary|type>
      --tree                 Show tree of commands.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List all mplx commands.
```

_See code: [@oclif/plugin-commands](https://github.com/oclif/plugin-commands/blob/v4.1.5/src/commands/commands.ts)_

## `mplx config`

Show the current config

```
USAGE
  $ mplx config [-c <value>]

FLAGS
  -c, --config=<value>  path to config file. Default is ~/.config/mplx/config.json

DESCRIPTION
  Show the current config

EXAMPLES
  $ mplx config
```

_See code: [src/commands/config/index.ts](https://github.com/metaplex-foundation/cli/blob/v0.0.0/src/commands/config/index.ts)_

## `mplx config get KEY`

Get a config value from a key

```
USAGE
  $ mplx config get KEY [-c <value>]

ARGUMENTS
  KEY  (rpcUrl|commitment|payer|keypair) The key to get

FLAGS
  -c, --config=<value>  path to config file. Default is ~/.config/mplx/config.json

DESCRIPTION
  Get a config value from a key

EXAMPLES
  $ mplx config get keypair

  $ mplx config get payer

  $ mplx config get rpcUrl

  $ mplx config get commitment
```

_See code: [src/commands/config/get.ts](https://github.com/metaplex-foundation/cli/blob/v0.0.0/src/commands/config/get.ts)_

## `mplx config set KEY VALUE`

Set a config value from a key

```
USAGE
  $ mplx config set KEY VALUE [-c <value>]

ARGUMENTS
  KEY    (rpcUrl|commitment|payer|keypair) The key to set
  VALUE  The value to set

FLAGS
  -c, --config=<value>  path to config file. Default is ~/.config/mplx/config.json

DESCRIPTION
  Set a config value from a key

EXAMPLES
  $ mplx config set keypair /path/to/keypair.json

  $ mplx config set payer /path/to/keypair.json

  $ mplx config set rpcUrl http://localhost:8899

  $ mplx config set commitment confirmed
```

_See code: [src/commands/config/set.ts](https://github.com/metaplex-foundation/cli/blob/v0.0.0/src/commands/config/set.ts)_

## `mplx create asset`

Create an asset

```
USAGE
  $ mplx create asset -n <value> -u <value> [--json] [--log-level debug|warn|error|info|trace] [-k <value>] [-p
    <value>] [-r <value>] [--commitment processed|confirmed|finalized] [-c <value>] [-s core]

FLAGS
  -c, --config=<value>       Path to config file. Default is ~/.config/mplx/config.json
  -k, --keypair=<value>      Path to keypair file (/path/keypair.json) or ledger (e.g. usb://ledger?key=0)
  -n, --name=<value>         (required) Asset name
  -p, --payer=<value>        Path to keypair file (/path/keypair.json) or ledger (e.g. usb://ledger?key=0)
  -r, --rpc=<value>          RPC URL for the cluster
  -s, --standard=<option>    [default: core] Asset standard
                             <options: core>
  -u, --uri=<value>          (required) Asset metadata URI
      --commitment=<option>  Commitment level
                             <options: processed|confirmed|finalized>

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Create an asset

EXAMPLES
  $ mplx create asset --json

  $ mplx create asset --log-level debug

  $ mplx create asset --keypair /path/to/keypair.json

  $ mplx create asset --keypair usb://ledger?key=0

  $ mplx create asset --rpc http://localhost:8899

  $ mplx create asset --commitment finalized

  $ mplx create asset -n "Cool Asset" -u "https://example.com/metadata.json"
```

_See code: [src/commands/create/asset.ts](https://github.com/metaplex-foundation/cli/blob/v0.0.0/src/commands/create/asset.ts)_

## `mplx create collection [FILE]`

describe the command here

```
USAGE
  $ mplx create collection [FILE] [-f] [-n <value>]

ARGUMENTS
  FILE  file to read

FLAGS
  -f, --force
  -n, --name=<value>  name to print

DESCRIPTION
  describe the command here

EXAMPLES
  $ mplx create collection
```

_See code: [src/commands/create/collection.ts](https://github.com/metaplex-foundation/cli/blob/v0.0.0/src/commands/create/collection.ts)_

## `mplx fetch asset ASSET`

Fetch an asset by mint

```
USAGE
  $ mplx fetch asset ASSET [--json] [--log-level debug|warn|error|info|trace] [-k <value>] [-p <value>] [-r
    <value>] [--commitment processed|confirmed|finalized] [-c <value>]

ARGUMENTS
  ASSET  Asset pubkey (mint) to fetch

FLAGS
  -c, --config=<value>       Path to config file. Default is ~/.config/mplx/config.json
  -k, --keypair=<value>      Path to keypair file (/path/keypair.json) or ledger (e.g. usb://ledger?key=0)
  -p, --payer=<value>        Path to keypair file (/path/keypair.json) or ledger (e.g. usb://ledger?key=0)
  -r, --rpc=<value>          RPC URL for the cluster
      --commitment=<option>  Commitment level
                             <options: processed|confirmed|finalized>

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Fetch an asset by mint

EXAMPLES
  $ mplx fetch asset --json

  $ mplx fetch asset --log-level debug

  $ mplx fetch asset --keypair /path/to/keypair.json

  $ mplx fetch asset --keypair usb://ledger?key=0

  $ mplx fetch asset --rpc http://localhost:8899

  $ mplx fetch asset --commitment finalized

  $ mplx fetch asset HaKyubAWuTS9AZkpUHtFkTKAHs1KKAJ3onZPmaP9zBpe
```

_See code: [src/commands/fetch/asset.ts](https://github.com/metaplex-foundation/cli/blob/v0.0.0/src/commands/fetch/asset.ts)_

## `mplx help [COMMAND]`

Display help for mplx.

```
USAGE
  $ mplx help [COMMAND...] [-n]

ARGUMENTS
  COMMAND...  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for mplx.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.2.16/src/commands/help.ts)_

## `mplx version`

```
USAGE
  $ mplx version [--json] [--verbose]

FLAGS
  --verbose  Show additional information about the CLI.

GLOBAL FLAGS
  --json  Format output as json.

FLAG DESCRIPTIONS
  --verbose  Show additional information about the CLI.

    Additionally shows the architecture, node version, operating system, and versions of plugins that the CLI is using.
```

_See code: [@oclif/plugin-version](https://github.com/oclif/plugin-version/blob/v2.2.15/src/commands/version.ts)_
<!-- commandsstop -->
