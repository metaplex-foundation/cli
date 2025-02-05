import inquirer from 'inquirer'

const formatWalletListItem = (rpc: {name: string; endpoint: string}) => {
  let paddedName

  if (rpc.name.length < 15) {
    const padding = 20 - rpc.name.length
    paddedName = rpc.name + ' '.repeat(padding)
  }

  return `${paddedName}  ${rpc.endpoint}`
}

const rpcSelector = async (rpcs: {name: string; endpoint: string}[]) => {
  const selectedRpc = await inquirer
    .prompt([
      /* Pass your questions in here */
      {
        type: 'select',
        name: 'rpcSelect',
        choices: rpcs.map((rpc) => {
          return {
            name: formatWalletListItem(rpc),
            value: {
              name: rpc.name,
              endpoint: rpc.endpoint,
            },
          }
        }),
        message: `Select an RPC`,
        pageSize: 20,
      },
    ])
    .then((answers) => {
      return answers.rpcSelect
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

  return selectedRpc
}

export default rpcSelector
