import { confirm } from '@inquirer/prompts'

// Generic boolean prompt that has a Yes or No option that takes a message as an argument.
export default async function booleanPrompt(message: string, defaultValue = false): Promise<boolean> {
  return confirm({
    message,
    default: defaultValue,
  })
}
