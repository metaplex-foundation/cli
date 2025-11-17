import { select } from '@inquirer/prompts'
import { Command, Flags, Args } from '@oclif/core'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

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

        // Validate that the selected template exists in the templates object
        if (!templates[template as keyof typeof templates]) {
            this.error(`Template '${template}' not found. Available templates: ${Object.keys(templates).join(', ')}`)
        }

        try {
            const { stdout, stderr } = await execAsync(`git clone ${templates[template as keyof typeof templates]}`)
            
            if (stdout) {
                this.log(stdout)
            }
            
            if (stderr) {
                this.error(stderr)
            }
            
            this.log(`Template '${template}' cloned successfully`)
        } catch (error) {
            this.error(`Failed to clone template '${template}': ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }
}