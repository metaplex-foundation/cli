import { select } from '@inquirer/prompts'

export interface RpcEndpoint {
  name: string
  url: string
}

export default async function rpcSelectorPrompt(endpoints: RpcEndpoint[]): Promise<RpcEndpoint> {
  const selectedRpc = await select<RpcEndpoint>({
    message: 'Select an RPC endpoint',
    choices: endpoints.map(endpoint => ({
      name: endpoint.name,
      value: endpoint
    }))
  })

  return selectedRpc
}
