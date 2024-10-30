// src/baseCommand.ts
import {Command, Flags, Interfaces} from '@oclif/core'
import { StandardColors } from './lib/StandardColors.js'
import { Context, createContext, getDefaultConfigPath } from './lib/Context.js'
import { Commitment } from '@metaplex-foundation/umi'

export type Flags<T extends typeof Command> = Interfaces.InferredFlags<typeof BaseCommand['baseFlags'] & T['flags']>
export type Args<T extends typeof Command> = Interfaces.InferredArgs<T['args']>

export abstract class BaseCommand<T extends typeof Command> extends Command {
  // add the --json flag
  static enableJsonFlag = true

  // define flags that can be inherited by any command that extends BaseCommand
  static baseFlags = {
    'log-level': Flags.option({
      default: 'info',
      helpGroup: 'GLOBAL',
      options: ['debug', 'warn', 'error', 'info', 'trace'] as const,
      summary: 'Specify level for logging.',
    })(),
    keypair: Flags.string({
      char: 'k',
      summary: 'Path to keypair file (/path/keypair.json) or ledger (e.g. usb://ledger?key=0)',
    }),
    payer: Flags.string({
      char: 'p',
      summary: 'Path to keypair file (/path/keypair.json) or ledger (e.g. usb://ledger?key=0)',
    }),
    rpc: Flags.string({
      char: 'r',
      summary: 'RPC URL for the cluster',
    }),
    commitment: Flags.string({
      summary: 'Commitment level',
      options: ['processed', 'confirmed', 'finalized'] as const,
    }),
    config: Flags.file({
      char: 'c',
      description: 'Path to config file. Default is ~/.config/mplx/config.json',
    })
  }

  static baseExamples =[
    '<%= config.bin %> <%= command.id %> --json',
    '<%= config.bin %> <%= command.id %> --log-level debug',
    '<%= config.bin %> <%= command.id %> --keypair /path/to/keypair.json',
    '<%= config.bin %> <%= command.id %> --keypair usb://ledger?key=0',
    '<%= config.bin %> <%= command.id %> --rpc http://localhost:8899',
    '<%= config.bin %> <%= command.id %> --commitment finalized',
  ]

  protected flags!: Flags<T>
  protected args!: Args<T>
  public context!: Context;

  public logSuccess(message: string): void {
    this.log(StandardColors.success(message));
  }

  public async init(): Promise<void> {
    await super.init()
    const {args, flags} = await this.parse({
      flags: this.ctor.flags,
      baseFlags: (super.ctor as typeof BaseCommand).baseFlags,
      enableJsonFlag: this.ctor.enableJsonFlag,
      args: this.ctor.args,
      strict: this.ctor.strict,
    })
    this.flags = flags as Flags<T>
    this.args = args as Args<T>

    const configPath = this.flags.config ?? getDefaultConfigPath(this.config.configDir)
    this.context = await createContext(configPath, {
      keypair: this.flags.keypair,
      payer: this.flags.payer,
      rpcUrl: this.flags.rpc,
      commitment: this.flags.commitment as (Commitment | undefined),
    })
  }

  protected async catch(err: Error & {exitCode?: number}): Promise<any> {
    // add any custom logic to handle errors from the command
    // or simply return the parent class error handling
    return super.catch(err)
  }

  protected async finally(_: Error | undefined): Promise<any> {
    // called after run and catch regardless of whether or not the command errored
    return super.finally(_)
  }
}
