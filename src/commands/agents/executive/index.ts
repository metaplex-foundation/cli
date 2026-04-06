import { Command } from '@oclif/core'

export default class AgentsExecutive extends Command {
  static override description = `Agent Executive Profile Management

  Manage executive profiles for agent execution delegation.
  An executive profile is a one-time on-chain PDA linked to your wallet
  that enables you to be authorized to act on behalf of registered agents.

  Commands:
    register    Create an executive profile for the current wallet
    delegate    Authorize an executive wallet to act on behalf of a registered agent (asset owner only)
    revoke      Remove an execution delegation for a registered agent
  `

  static override examples = [
    '<%= config.bin %> agents executive register',
    '<%= config.bin %> agents executive delegate <asset> --executive <wallet>',
    '<%= config.bin %> agents executive revoke <asset> --executive <wallet>',
  ]

  static override flags = {

  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(AgentsExecutive)
    this.log(AgentsExecutive.description)
    this.log('\nRun `mplx agents executive --help` for usage information.')
  }
}
