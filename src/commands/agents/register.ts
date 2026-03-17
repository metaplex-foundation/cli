import { Args, Flags } from '@oclif/core'
import fs from 'node:fs'
import ora from 'ora'

import { generateSigner, publicKey } from '@metaplex-foundation/umi'
import { generateExplorerUrl } from '../../explorers.js'
import { TransactionCommand } from '../../TransactionCommand.js'
import { txSignatureToString } from '../../lib/util.js'
import { registerIdentityV1 } from '@metaplex-foundation/mpl-agent-registry/dist/src/generated/identity/index.js'
import createAssetFromArgs from '../../lib/core/create/createAssetFromArgs.js'
import uploadJson from '../../lib/uploader/uploadJson.js'
import { isUrl, resolveImageUri } from '../../lib/uploader/resolveImageUri.js'
import agentDocumentPrompt, { type AgentRegistrationDocument, type AgentService } from '../../prompts/agentDocumentPrompt.js'

export default class AgentsRegister extends TransactionCommand<typeof AgentsRegister> {
  static override description = `Register an agent identity on a Core asset.

  Binds an on-chain identity record to an MPL Core asset, creating a discoverable PDA
  and attaching lifecycle hooks for Transfer, Update, and Execute operations.

  Multiple workflows:

  1. Full wizard (creates asset + document + registers):
     mplx agents register --new --wizard

  2. New asset with flags (creates asset + document + registers):
     mplx agents register --new --name "My Agent" --description "..." --image "./avatar.png"
     mplx agents register --new --name "My Agent" --description "..." --image "./avatar.png" --services '[{"name":"MCP","endpoint":"https://..."}]'

  3. Existing asset with new document:
     mplx agents register <asset> --name "My Agent" --description "..." --image "./avatar.png"

  4. Existing asset with existing document URI:
     mplx agents register <asset> --uri "https://arweave.net/..."

  5. Existing asset with local document file:
     mplx agents register <asset> --from-file "./agent-doc.json"

  Registration is a one-time operation per asset. Already-registered assets cannot re-register.
  `

  static override examples = [
    '$ mplx agents register --new --wizard',
    '$ mplx agents register --new --name "My Agent" --description "An AI agent" --image "./avatar.png"',
    '$ mplx agents register --new --name "My Agent" --description "An AI agent" --image "./avatar.png" --services \'[{"name":"MCP","endpoint":"https://myagent.com/mcp","version":"1.0"}]\'',
    '$ mplx agents register --new --name "My Agent" --description "An AI agent" --image "./avatar.png" --supported-trust \'["reputation","tee-attestation"]\'',
    '$ mplx agents register --new --name "My Agent" --description "An AI agent" --image "./avatar.png" --collection <collection>',
    '$ mplx agents register <asset> --uri "https://arweave.net/..."',
    '$ mplx agents register <asset> --name "My Agent" --description "An AI agent" --image "https://arweave.net/..."',
    '$ mplx agents register <asset> --from-file "./agent-doc.json"',
  ]

  static override usage = 'agents register [ASSET] [FLAGS]'

  static override args = {
    asset: Args.string({ description: 'The MPL Core asset address to register (not required with --new)', required: false }),
  }

  static override flags = {
    // Asset creation
    new: Flags.boolean({
      description: 'Create a new Core asset and register it as an agent',
      default: false,
    }),
    owner: Flags.string({
      description: 'Owner public key for the new asset (defaults to signer, only with --new)',
      dependsOn: ['new'],
    }),
    collection: Flags.string({
      description: 'Collection address the asset belongs to',
    }),

    // Document source: wizard, uri, from-file, or inline flags
    wizard: Flags.boolean({
      description: 'Use interactive wizard to build the registration document',
      exclusive: ['uri', 'from-file', 'name'],
    }),
    uri: Flags.string({
      description: 'Existing URI pointing to the agent registration JSON document',
      exclusive: ['wizard', 'from-file', 'name'],
    }),
    'from-file': Flags.string({
      description: 'Path to a local agent registration JSON file to upload',
      exclusive: ['wizard', 'uri', 'name'],
    }),

    // Inline document creation flags
    name: Flags.string({
      description: 'Agent name (for building the registration document)',
      exclusive: ['wizard', 'uri', 'from-file'],
    }),
    description: Flags.string({
      description: 'Agent description',
      dependsOn: ['name'],
    }),
    image: Flags.string({
      description: 'Agent image file path (uploaded) or existing URI',
      dependsOn: ['name'],
    }),
    active: Flags.boolean({
      description: 'Set agent as active in the document (only used with --name)',
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


    // Output
    'save-document': Flags.string({
      description: 'Save the generated document JSON to a local file path',
    }),
  }

  private async resolveDocumentUri(flags: Record<string, any>): Promise<{ uri: string; document?: AgentRegistrationDocument }> {
    const { umi } = this.context

    // 1. Existing URI — nothing to do
    if (flags.uri) {
      return { uri: flags.uri }
    }

    let doc: AgentRegistrationDocument

    // 2. Wizard
    if (flags.wizard) {
      const result = await agentDocumentPrompt()
      doc = result.document
      if (result.collection && !flags.collection) {
        flags.collection = result.collection
      }

      if (doc.image && !isUrl(doc.image)) {
        doc.image = await resolveImageUri(this.context.umi, doc.image)
      }
    }
    // 3. From file
    else if (flags['from-file']) {
      try {
        const raw = fs.readFileSync(flags['from-file'], 'utf-8')
        doc = JSON.parse(raw) as AgentRegistrationDocument
      } catch (err) {
        this.error(`Failed to read file: ${err}`)
      }

      if (doc.type !== 'agent-registration-v1') {
        this.error('Invalid document: "type" must be "agent-registration-v1"')
      }
    }
    // 4. Inline flags
    else if (flags.name) {
      if (!flags.description) {
        this.error('--description is required when using --name')
      }
      if (!flags.image) {
        this.error('--image is required when using --name')
      }

      const imageUri = await resolveImageUri(this.context.umi, flags.image)

      // Parse --services JSON or fall back to deprecated individual flags
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
      this.error('Provide --wizard, --uri, --from-file, or --name to specify the registration document.')
    }

    // Save locally if requested
    if (flags['save-document']) {
      fs.writeFileSync(flags['save-document'], JSON.stringify(doc, null, 2))
      this.log(`Document saved to ${flags['save-document']}`)
    }

    // Upload the document
    const uploadSpinner = ora('Uploading registration document...').start()
    const uri = await uploadJson(umi, doc).catch((err) => {
      uploadSpinner.fail(`Failed to upload document: ${err}`)
      throw err
    })
    uploadSpinner.succeed(`Document uploaded to ${uri}`)

    return { uri, document: doc }
  }

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(AgentsRegister)
    const { umi, explorer, chain } = this.context

    // Step 1: Resolve the registration document URI
    const { uri, document } = await this.resolveDocumentUri(flags)

    // Step 2: Create or resolve the asset
    let assetAddress: string

    if (flags.new) {
      const assetName = document?.name ?? flags.name
      if (!assetName) {
        this.error('--name is required when using --new (or use --wizard)')
      }

      const assetSpinner = ora('Creating Core asset...').start()

      const assetSigner = generateSigner(umi)
      const assetResult = await createAssetFromArgs(umi, {
        assetSigner,
        name: assetName,
        uri,
        collection: flags.collection,
        owner: flags.owner,
      }).catch((err) => {
        assetSpinner.fail(`Failed to create asset: ${err}`)
        throw err
      })

      assetAddress = assetResult.asset
      assetSpinner.succeed(`Core asset created: ${assetAddress}`)
    } else {
      if (!args.asset) {
        this.error('Asset address is required. Provide an asset address or use --new to create one.')
      }
      assetAddress = args.asset
    }

    // Step 3: Register the agent identity
    const registerSpinner = ora('Registering agent identity...').start()

    const tx = await registerIdentityV1(umi, {
      asset: publicKey(assetAddress),
      collection: flags.collection ? publicKey(flags.collection) : undefined,
      agentRegistrationUri: uri,
    }).sendAndConfirm(umi)

    const signature = txSignatureToString(tx.signature)

    registerSpinner.succeed('Agent identity registered successfully')

    const explorerUrl = generateExplorerUrl(explorer, chain, signature, 'transaction')

    this.log(`--------------------------------
  Asset: ${assetAddress}
  Registration URI: ${uri}
  Signature: ${signature}
  Explorer: ${explorerUrl}
--------------------------------`)

    return {
      asset: assetAddress,
      uri,
      signature,
      explorer: explorerUrl,
    }
  }
}
