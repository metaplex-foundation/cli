// src/baseCommand.ts
import {Commitment} from '@metaplex-foundation/umi'
import {Command, Flags, Interfaces} from '@oclif/core'

import {Context, createContext, getDefaultConfigPath} from './lib/Context.js'
import {StandardColors} from './lib/StandardColors.js'

export type Flags<T extends typeof Command> = Interfaces.InferredFlags<T['flags'] & (typeof BaseCommand)['baseFlags']>
export type Args<T extends typeof Command> = Interfaces.InferredArgs<T['args']>

/* 

  TODO - Cleanout base command of helper flags that are not needed for non transactional commands.

*/

export abstract class BaseCommand<T extends typeof Command> extends Command {
  static baseExamples = []

  // define flags that can be inherited by any command that extends BaseCommand
  static baseFlags = {
    config: Flags.file({
      char: 'c',
      description: 'Path to config file. Default is ~/.config/mplx/config.json',
      helpGroup: 'GLOBAL',
    }),
    keypair: Flags.string({
      char: 'k',
      summary: 'Path to keypair file (/path/keypair.json) or ledger (e.g. usb://ledger?key=0)',
      helpGroup: 'GLOBAL',
    }),
    'log-level': Flags.option({
      default: 'info',
      helpGroup: 'GLOBAL',
      options: ['debug', 'warn', 'error', 'info', 'trace'] as const,
      summary: 'Specify level for logging.',
    })(),
    payer: Flags.string({
      char: 'p',
      summary: 'Path to keypair file (/path/keypair.json) or ledger (e.g. usb://ledger?key=0)',
      helpGroup: 'GLOBAL',
    }),
  }

  // add the --json flag
  static enableJsonFlag = true

  protected args!: Args<T>
  public context!: Context
  protected flags!: Flags<T>

  protected async catch(err: {exitCode?: number} & Error): Promise<unknown> {
    // add any custom logic to handle errors from the command
    // or simply return the parent class error handling
    return super.catch(err)
  }

  protected async finally(_: Error | undefined): Promise<unknown> {
    // called after run and catch regardless of whether or not the command errored
    return super.finally(_)
  }

  public async init(): Promise<void> {
    await super.init()
    const {args, flags} = await this.parse({
      args: this.ctor.args,
      baseFlags: (super.ctor as typeof BaseCommand).baseFlags,
      enableJsonFlag: this.ctor.enableJsonFlag,
      flags: this.ctor.flags,
      strict: this.ctor.strict,
    })
    this.flags = flags as Flags<T>
    this.args = args as Args<T>

    const configPath = this.flags.config ?? getDefaultConfigPath(this.config.configDir)
    this.context = await createContext(configPath, {
      commitment: this.flags.commitment as Commitment | undefined,
      keypair: this.flags.keypair,
      payer: this.flags.payer,
      rpcUrl: this.flags.rpc,
    })
  }

  public logSuccess(message: string): void {
    this.log(StandardColors.success(message))
  }
}
