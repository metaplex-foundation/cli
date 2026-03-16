import { Command } from '@oclif/core'

export default class AgentsExecutive extends Command {
  static override description = `Agent Executive Profile Management

  Manage executive profiles for agent execution delegation.
  An executive profile is a one-time on-chain PDA linked to your wallet
  that enables you to sign transactions on behalf of registered agents.

  Commands:
    register    Create an executive profile for the current wallet
    delegate    Delegate execution of a registered agent to your executive profile
  `

  static override examples = [
    '<%= config.bin %> agents executive register',
    '<%= config.bin %> agents executive delegate <asset>',
  ]

  static override flags = {

  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(AgentsExecutive)
    this.log(AgentsExecutive.description)
    this.log('\nRun `mplx agents executive --help` for usage information.')
  }
}
