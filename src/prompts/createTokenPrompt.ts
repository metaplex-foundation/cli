import inquirer from 'inquirer'
import path from 'node:path';
import fs from 'node:fs';

const createTokenPrompt = async () => {
    const createTokenAnswers = await inquirer
        .prompt([
            /* Pass your questions in here */
            {
                name: 'name',
                type: 'input',
                message: 'What is the name of the token?',
                required: true,
            },
            {
                name: 'description',
                type: 'input',
                message: 'What is the description of the token?',
                required: true,
            },
            {
                name: 'symbol',
                type: 'input',
                message: 'Symbol of the token?',
                required: true,
            },
            {
                name: 'decimals',
                type: 'number',
                message: 'How many decimals does the token have?',
                required: true,
            },
            {
                name: 'image',
                type: 'input',
                message: 'Path to the image of the token?',
                required: true,
                validate: (value) => {

                    const currentDir = process.cwd()

                    const imagePath = path.resolve(currentDir, value)

                    if (fs.existsSync(imagePath)) {
                        return true
                    }

                    return 'File does not exist'
                },
            },
            {
                name: 'mint',
                type: 'number',
                message: 'How many tokens to mint in basis points?',
                required: true,
            }
        ])
        .then((answers) => {
            return answers
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

    return createTokenAnswers
}

export default createTokenPrompt
