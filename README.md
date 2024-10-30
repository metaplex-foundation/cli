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
$ npm install -g cli
$ mplx COMMAND
running command...
$ mplx (--version)
cli/0.0.0 darwin-arm64 node-v18.20.4
$ mplx --help [COMMAND]
USAGE
  $ mplx COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`mplx hello PERSON`](#mplx-hello-person)
* [`mplx hello world`](#mplx-hello-world)
* [`mplx help [COMMAND]`](#mplx-help-command)
* [`mplx plugins`](#mplx-plugins)
* [`mplx plugins add PLUGIN`](#mplx-plugins-add-plugin)
* [`mplx plugins:inspect PLUGIN...`](#mplx-pluginsinspect-plugin)
* [`mplx plugins install PLUGIN`](#mplx-plugins-install-plugin)
* [`mplx plugins link PATH`](#mplx-plugins-link-path)
* [`mplx plugins remove [PLUGIN]`](#mplx-plugins-remove-plugin)
* [`mplx plugins reset`](#mplx-plugins-reset)
* [`mplx plugins uninstall [PLUGIN]`](#mplx-plugins-uninstall-plugin)
* [`mplx plugins unlink [PLUGIN]`](#mplx-plugins-unlink-plugin)
* [`mplx plugins update`](#mplx-plugins-update)

## `mplx hello PERSON`

Say hello

```
USAGE
  $ mplx hello PERSON -f <value>

ARGUMENTS
  PERSON  Person to say hello to

FLAGS
  -f, --from=<value>  (required) Who is saying hello

DESCRIPTION
  Say hello

EXAMPLES
  $ mplx hello friend --from oclif
  hello friend from oclif! (./src/commands/hello/index.ts)
```

_See code: [src/commands/hello/index.ts](https://github.com/metaplex-foundation/cli/blob/v0.0.0/src/commands/hello/index.ts)_

## `mplx hello world`

Say hello world

```
USAGE
  $ mplx hello world

DESCRIPTION
  Say hello world

EXAMPLES
  $ mplx hello world
  hello world! (./src/commands/hello/world.ts)
```

_See code: [src/commands/hello/world.ts](https://github.com/metaplex-foundation/cli/blob/v0.0.0/src/commands/hello/world.ts)_

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

## `mplx plugins`

List installed plugins.

```
USAGE
  $ mplx plugins [--json] [--core]

FLAGS
  --core  Show core plugins.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ mplx plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.15/src/commands/plugins/index.ts)_

## `mplx plugins add PLUGIN`

Installs a plugin into mplx.

```
USAGE
  $ mplx plugins add PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into mplx.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the MPLX_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the MPLX_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ mplx plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ mplx plugins add myplugin

  Install a plugin from a github url.

    $ mplx plugins add https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ mplx plugins add someuser/someplugin
```

## `mplx plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ mplx plugins inspect PLUGIN...

ARGUMENTS
  PLUGIN...  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ mplx plugins inspect myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.15/src/commands/plugins/inspect.ts)_

## `mplx plugins install PLUGIN`

Installs a plugin into mplx.

```
USAGE
  $ mplx plugins install PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into mplx.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the MPLX_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the MPLX_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ mplx plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ mplx plugins install myplugin

  Install a plugin from a github url.

    $ mplx plugins install https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ mplx plugins install someuser/someplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.15/src/commands/plugins/install.ts)_

## `mplx plugins link PATH`

Links a plugin into the CLI for development.

```
USAGE
  $ mplx plugins link PATH [-h] [--install] [-v]

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help          Show CLI help.
  -v, --verbose
      --[no-]install  Install dependencies after linking the plugin.

DESCRIPTION
  Links a plugin into the CLI for development.

  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.


EXAMPLES
  $ mplx plugins link myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.15/src/commands/plugins/link.ts)_

## `mplx plugins remove [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ mplx plugins remove [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ mplx plugins unlink
  $ mplx plugins remove

EXAMPLES
  $ mplx plugins remove myplugin
```

## `mplx plugins reset`

Remove all user-installed and linked plugins.

```
USAGE
  $ mplx plugins reset [--hard] [--reinstall]

FLAGS
  --hard       Delete node_modules and package manager related files in addition to uninstalling plugins.
  --reinstall  Reinstall all plugins after uninstalling.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.15/src/commands/plugins/reset.ts)_

## `mplx plugins uninstall [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ mplx plugins uninstall [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ mplx plugins unlink
  $ mplx plugins remove

EXAMPLES
  $ mplx plugins uninstall myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.15/src/commands/plugins/uninstall.ts)_

## `mplx plugins unlink [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ mplx plugins unlink [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ mplx plugins unlink
  $ mplx plugins remove

EXAMPLES
  $ mplx plugins unlink myplugin
```

## `mplx plugins update`

Update installed plugins.

```
USAGE
  $ mplx plugins update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.15/src/commands/plugins/update.ts)_
<!-- commandsstop -->
