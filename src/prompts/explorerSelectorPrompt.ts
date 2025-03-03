import inquirer from 'inquirer'

const explorerSelectorPrompt = async (explorers: {displayName: string, name: string}[]): Promise<string> => {
  const selectedRpc = await inquirer
    .prompt([
      /* Pass your questions in here */
      {
        type: 'select',
        name: 'explorerSelect',
        choices: explorers.map((explorer) => {
          return {
            name: explorer.displayName,
            value: explorer.name,
          }
        }),
        message: `Select an Explorer`,
      },
    ])
    .then((answers) => {
      return answers.explorerSelect
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

export default explorerSelectorPrompt
