import { select } from '@inquirer/prompts'
import { Command, Flags } from '@oclif/core'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

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
            options: Object.keys(templates)
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