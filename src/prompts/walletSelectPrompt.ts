import {shortenAddress} from '../lib/util.js'
import inquirer from 'inquirer'

const formatWalletListItem = (wallet: {name: string; path: string; address: string}) => {
  let paddedName

  if (wallet.name.length < 6) {
    const padding = 6 - wallet.name.length
    paddedName = wallet.name + ' '.repeat(padding)
  }

  return `${paddedName}  ${shortenAddress(wallet.address)}`
}

const walletSelectorPrompt = async (wallets: {name: string; path: string; address: string}[]) => {
  const selectedWallet = await inquirer
    .prompt([
      /* Pass your questions in here */
      {
        type: 'select',
        name: 'walletSelect',
        choices: wallets.map((wallet) => {
          return {
            name: formatWalletListItem(wallet),
            value: {
              name: wallet.name,
              path: wallet.path,
              address: wallet.address,
            },
          }
        }),
        message: `Select a wallet`,
        pageSize: 20,
      },
    ])
    .then((answers) => {
      return answers.walletSelect
    })
    .catch((error) => {
      if (error.isTtyError) {
        // Prompt couldn't be rendered in the current environment
        console.log("Prompt couldn't be rendered in the current environment")
      } else {
        // Something else went wrong
        console.log(error)
      }
    })

  return selectedWallet
}

export default walletSelectorPrompt
