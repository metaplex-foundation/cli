import { Args, Command, Flags } from '@oclif/core'
import { BaseCommand } from '../../../BaseCommand.js'
import { exec } from 'child_process'
import { confirm, select } from '@inquirer/prompts'

const templates = {
    'standard - nextjs-tailwind-shadcn': 'https://github.com/metaplex-foundation/metaplex-nextjs-tailwind-shadcn-template.git',
    'standard - nextjs-tailwind': 'https://github.com/metaplex-foundation/metaplex-nextjs-tailwind-template.git',
    '404 - nextjs-tailwind-shadcn': 'https://github.com/metaplex-foundation/mpl-hybrid-404-ui-template-nextjs-tailwind-shadcn.git'
}

export default class ToolboxWebsiteTemplate extends Command {

    static override description = 'Download a MPLX website template'

    static override flags = {
        '--template': Flags.string({
            description: 'The template to download',
            required: false,
            options: ['mplx', 'cm']
        })
    }

    public async run(): Promise<void> {
        const { args, flags } = await this.parse(ToolboxWebsiteTemplate)

        let template = flags.template || undefined


        if (!template) {
            // launch a prompt to select the template
            template = await select({
                message: 'Select the template to download',
                choices: Object.keys(templates)
            })
        }

        exec(`git clone ${templates[template as keyof typeof templates]}`, (error, stdout, stderr) => {
            if (error) {
                this.error(error)
            }
            this.log(stdout)
            this.log(stderr)
        })

    }


}