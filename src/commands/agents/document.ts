import { Flags } from '@oclif/core'
import fs from 'node:fs'
import ora from 'ora'

import { TransactionCommand } from '../../TransactionCommand.js'
import uploadJson from '../../lib/uploader/uploadJson.js'
import { isUrl, resolveImageUri } from '../../lib/uploader/resolveImageUri.js'
import agentDocumentPrompt, { type AgentRegistrationDocument, type AgentService } from '../../prompts/agentDocumentPrompt.js'

export default class AgentsDocument extends TransactionCommand<typeof AgentsDocument> {
  static override description = `Create and upload an agent registration document (agent-registration-v1 JSON).

  Generates the registration metadata document independently. Useful when you want
  to create or preview the document before registering, or reuse the same document URI.

  For a combined workflow use 'mplx agents register' which handles document creation
  and registration together.
  `

  static override examples = [
    '$ mplx agents document --wizard',
    '$ mplx agents document --name "My Agent" --description "An AI agent" --image "./avatar.png"',
    '$ mplx agents document --name "My Agent" --description "An AI agent" --image "./avatar.png" --services \'[{"name":"MCP","endpoint":"https://myagent.com/mcp","version":"1.0"}]\'',
    '$ mplx agents document --name "My Agent" --description "An AI agent" --image "./avatar.png" --supported-trust \'["reputation","tee-attestation"]\'',
    '$ mplx agents document --from-file "./agent-doc.json"',
    '$ mplx agents document --wizard --output "./agent-doc.json" --no-upload',
  ]

  static override usage = 'agents document [FLAGS]'

  static override flags = {
    wizard: Flags.boolean({
      description: 'Use interactive wizard to build the document',
      exclusive: ['name', 'from-file'],
    }),
    'from-file': Flags.string({
      description: 'Path to an existing agent registration JSON file to upload',
      exclusive: ['wizard', 'name'],
    }),
    name: Flags.string({
      description: 'Agent name',
      exclusive: ['wizard', 'from-file'],
    }),
    description: Flags.string({
      description: 'Agent description',
      dependsOn: ['name'],
    }),
    image: Flags.string({
      description: 'Image file path (will be uploaded) or existing URI',
      dependsOn: ['name'],
    }),
    active: Flags.boolean({
      description: 'Set agent as active (only used with --name)',
      default: true,
    }),
    services: Flags.string({
      description: 'Service endpoints as a JSON array, e.g. \'[{"name":"MCP","endpoint":"https://...","version":"1.0","skills":["search"]}]\'',
      dependsOn: ['name'],
    }),
    'supported-trust': Flags.string({
      description: 'Supported trust models as a JSON array, e.g. \'["reputation","tee-attestation"]\'',
      dependsOn: ['name'],
    }),
    registrations: Flags.string({
      description: 'On-chain registration records as a JSON array, e.g. \'[{"agentId":"...","agentRegistry":"solana:mainnet:..."}]\'',
      dependsOn: ['name'],
    }),

    output: Flags.string({
      char: 'o',
      description: 'Save the document JSON to a local file path',
    }),
    'no-upload': Flags.boolean({
      description: 'Only save locally, do not upload (requires --output)',
      dependsOn: ['output'],
    }),
  }

  public async run(): Promise<unknown> {
    const { flags } = await this.parse(AgentsDocument)
    const { umi } = this.context

    let doc: AgentRegistrationDocument

    if (flags.wizard) {
      const result = await agentDocumentPrompt()
      doc = result.document

      if (doc.image && !isUrl(doc.image)) {
        doc.image = await resolveImageUri(umi, doc.image)
      }
    } else if (flags['from-file']) {
      try {
        const raw = fs.readFileSync(flags['from-file'], 'utf-8')
        doc = JSON.parse(raw) as AgentRegistrationDocument
      } catch (err) {
        this.error(`Failed to read file: ${err}`)
      }

      if (doc.type !== 'agent-registration-v1') {
        this.error('Invalid document: "type" must be "agent-registration-v1"')
      }
    } else if (flags.name) {
      if (!flags.description) {
        this.error('--description is required')
      }
      if (!flags.image) {
        this.error('--image is required')
      }

      const imageUri = await resolveImageUri(umi, flags.image)

      let services: AgentService[] = []
      if (flags.services) {
        try {
          services = JSON.parse(flags.services) as AgentService[]
        } catch {
          this.error('--services must be a valid JSON array, e.g. \'[{"name":"MCP","endpoint":"https://..."}]\'')
        }
      }

      let supportedTrust: AgentRegistrationDocument['supportedTrust']
      if (flags['supported-trust']) {
        try {
          supportedTrust = JSON.parse(flags['supported-trust']) as string[]
        } catch {
          this.error('--supported-trust must be a valid JSON array, e.g. \'["reputation","tee-attestation"]\'')
        }
      }

      let registrations: AgentRegistrationDocument['registrations']
      if (flags.registrations) {
        try {
          registrations = JSON.parse(flags.registrations) as AgentRegistrationDocument['registrations']
        } catch {
          this.error('--registrations must be a valid JSON array, e.g. \'[{"agentId":"...","agentRegistry":"..."}]\'')
        }
      }

      doc = {
        type: 'agent-registration-v1',
        name: flags.name,
        description: flags.description,
        image: imageUri,
        active: flags.active,
        services: services.length > 0 ? services : undefined,
        supportedTrust,
        registrations,
      }
    } else {
      this.error('Provide --wizard, --from-file, or --name to create a document.')
    }

    if (flags.output) {
      fs.writeFileSync(flags.output, JSON.stringify(doc, null, 2))
      this.log(`Document saved to ${flags.output}`)
    }

    if (flags['no-upload']) {
      this.log('\nSkipped upload. Use the saved file with --from-file later to upload.')
      return { document: doc }
    }

    const uploadSpinner = ora('Uploading registration document...').start()
    const uri = await uploadJson(umi, doc).catch((err) => {
      uploadSpinner.fail(`Failed to upload document: ${err}`)
      throw err
    })
    uploadSpinner.succeed(`Document uploaded to ${uri}`)

    this.log(`\n--------------------------------
  Registration URI: ${uri}

  Use this URI with: mplx agents register <asset> --uri "${uri}"
--------------------------------`)

    return {
      uri,
      document: doc,
    }
  }
}
