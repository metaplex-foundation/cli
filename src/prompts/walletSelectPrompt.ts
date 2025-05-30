import { select } from '@inquirer/prompts'

export interface Wallet {
  name: string
  path: string
  publicKey: string
}

export default async function walletSelectorPrompt(wallets: Wallet[]): Promise<Wallet> {
  const selectedWallet = await select<Wallet>({
    message: 'Select a wallet',
    choices: wallets.map(wallet => ({
      name: wallet.name,
      value: wallet
    }))
  })

  return selectedWallet
}
