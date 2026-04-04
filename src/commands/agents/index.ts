import { Command } from '@oclif/core'

export default class Agents extends Command {
  static override description = `Metaplex Agent Registry Program

  Register and manage on-chain agent identities using the MPL Agent Registry.
  Agents are MPL Core assets with bound identity records, lifecycle hooks,
  and built-in wallets (Asset Signer PDAs).

  Commands:
    register        Register an agent identity on a Core asset (can also create asset + document)
    fetch           Fetch and display agent identity data
    set-agent-token Link a Genesis token to a registered agent identity
    executive       Manage executive profiles and execution delegation
  `

  static override examples = [
    '<%= config.bin %> agents register --new --wizard',
    '<%= config.bin %> agents register <asset> --uri "https://arweave.net/..."',
    '<%= config.bin %> agents fetch <asset>',
    '<%= config.bin %> agents executive register',
    '<%= config.bin %> agents executive delegate <asset> --executive <wallet>',
    '<%= config.bin %> agents executive revoke <asset> --executive <wallet>',
    '<%= config.bin %> agents set-agent-token <agent-asset> <genesis-account>',
  ]

  static override flags = {

  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(Agents)
    this.log(Agents.description)
    this.log('\nRun `mplx agents --help` for usage information.')
  }
}
