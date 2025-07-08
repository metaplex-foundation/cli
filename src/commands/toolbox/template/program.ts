import { select } from '@inquirer/prompts'
import { Command, Flags, Args } from '@oclif/core'
import { exec } from 'child_process'

const templates = {
    'shank': 'https://github.com/metaplex-foundation/solana-project-template-2.0.git',
}

export default class ToolboxProgramTemplate extends Command {

    static override description = 'Download a MPLX program template'

    static override args = {
        template: Args.string({
            description: 'The template to download',
            required: false,
            options: ['shank']
        })
    }

    public async run(): Promise<void> {
        const { args, flags } = await this.parse(ToolboxProgramTemplate)

        let template = args.template || undefined


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