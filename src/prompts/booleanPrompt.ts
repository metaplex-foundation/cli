import inquirer from 'inquirer'

// Generic boolean prompt that has a Yes or No option that takes a message as an argument.
const booleanPrompt = async (message: string) => {
  const selectedPlugins = await inquirer
    .prompt([
      /* Pass your questions in here */
      {
        type: 'confirm',
        name: 'confirm',
        message: message,
      },
    ])
    .then((answers) => {
      return answers.confirm
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

  console.log(selectedPlugins)
  return selectedPlugins
}

export default booleanPrompt
