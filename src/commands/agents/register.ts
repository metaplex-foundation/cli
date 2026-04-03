import { Args, Flags } from '@oclif/core'
import fs from 'node:fs'
import ora from 'ora'
import { select, input } from '@inquirer/prompts'

import { generateSigner, publicKey } from '@metaplex-foundation/umi'
import { generateExplorerUrl } from '../../explorers.js'
import { TransactionCommand } from '../../TransactionCommand.js'
import { txSignatureToString, detectSvmNetwork } from '../../lib/util.js'
import { registerIdentityV1 } from '@metaplex-foundation/mpl-agent-registry/dist/src/generated/identity/index.js'
import { mintAndSubmitAgent, isAgentApiError, isAgentApiNetworkError, isAgentValidationError } from '@metaplex-foundation/mpl-agent-registry/dist/src/api/index.js'
import createAssetFromArgs from '../../lib/core/create/createAssetFromArgs.js'
import uploadJson from '../../lib/uploader/uploadJson.js'
import { isUrl, resolveImageUri } from '../../lib/uploader/resolveImageUri.js'
import agentDocumentPrompt, { AGENT_REGISTRATION_TYPE, type AgentRegistrationDocument, type AgentService } from '../../prompts/agentDocumentPrompt.js'

export default class AgentsRegister extends TransactionCommand<typeof AgentsRegister> {
  static override description = `Register an agent identity on a Core asset.

  By default, uses the Metaplex Agent API to create a Core asset and register
  identity in a single transaction (no Irys upload needed).

  Use --use-ix to send the registerIdentityV1 instruction directly instead.
  This is needed for existing assets or custom document workflows.

  Workflows:

  1. API (default):
     mplx agents register --name "My Agent" --description "..." --image "./avatar.png"

  2. Direct IX with existing asset:
     mplx agents register <asset> --use-ix --from-file "./agent-doc.json"

  3. Direct IX with new asset:
     mplx agents register --new --use-ix --name "My Agent" --description "..." --image "./avatar.png"

  4. Interactive wizard (direct IX):
     mplx agents register --new --wizard
  `

  static override examples = [
    '$ mplx agents register --name "My Agent" --description "An AI agent" --image "./avatar.png"',
    '$ mplx agents register --name "My Agent" --description "An AI agent" --image "./avatar.png" --services \'[{"name":"MCP","endpoint":"https://myagent.com/mcp"}]\'',
    '$ mplx agents register <asset> --use-ix --from-file "./agent-doc.json"',
    '$ mplx agents register --new --use-ix --name "My Agent" --description "An AI agent" --image "./avatar.png"',
    '$ mplx agents register --new --wizard',
  ]

  static override usage = 'agents register [ASSET] [FLAGS]'

  static override args = {
    asset: Args.string({ description: 'The MPL Core asset address to register (not required with --new)', required: false }),
  }

  static override flags = {
    // Mode
    'use-ix': Flags.boolean({
      description: 'Send the registerIdentityV1 instruction directly instead of using the Metaplex API',
      default: false,
    }),

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

    // Document source: wizard, from-file, or inline flags
    wizard: Flags.boolean({
      description: 'Use interactive wizard to build the registration document (implies --use-ix)',
      exclusive: ['from-file', 'name'],
    }),
    'from-file': Flags.string({
      description: 'Path to a local agent registration JSON file to upload (implies --use-ix)',
      exclusive: ['wizard', 'name'],
    }),

    // Inline document creation flags (used by both API and on-chain)
    name: Flags.string({
      description: 'Agent name',
      exclusive: ['wizard', 'from-file'],
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
      description: 'Service endpoints as a JSON array, e.g. \'[{"name":"MCP","endpoint":"https://..."}]\'',
      dependsOn: ['name'],
    }),
    'supported-trust': Flags.string({
      description: 'Supported trust models as a JSON array, e.g. \'["reputation","tee-attestation"]\'',
      dependsOn: ['name'],
    }),

    // Output
    'save-document': Flags.string({
      description: 'Save the generated document JSON to a local file path',
    }),
  }

  // ─── On-chain path helpers ────────────────────────────────────────────────

  private async resolveDocumentUri(flags: Record<string, any>, assetAddress?: string): Promise<{ uri: string; document?: AgentRegistrationDocument }> {
    const { umi } = this.context

    let doc: AgentRegistrationDocument

    if (flags.wizard) {
      const result = await agentDocumentPrompt()
      doc = result.document
      if (result.collection && !flags.collection) {
        flags.collection = result.collection
      }

      if (doc.image && !isUrl(doc.image)) {
        doc.image = await resolveImageUri(this.context.umi, doc.image)
      }
    } else if (flags['from-file']) {
      try {
        const raw = fs.readFileSync(flags['from-file'], 'utf-8')
        doc = JSON.parse(raw) as AgentRegistrationDocument
      } catch (err) {
        this.error(`Failed to read file: ${err}`)
      }

      if (doc.type !== AGENT_REGISTRATION_TYPE) {
        this.error(`Invalid document: "type" must be "${AGENT_REGISTRATION_TYPE}"`)
      }
    } else if (flags.name) {
      if (!flags.description) {
        this.error('--description is required when using --name')
      }
      if (!flags.image) {
        this.error('--image is required when using --name')
      }

      const imageUri = await resolveImageUri(this.context.umi, flags.image)

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

      doc = {
        type: AGENT_REGISTRATION_TYPE,
        name: flags.name,
        description: flags.description,
        image: imageUri,
        active: flags.active,
        services: services.length > 0 ? services : undefined,
        supportedTrust,
      }
    } else {
      this.error('Provide --wizard, --from-file, or --name to specify the registration document.')
    }

    if (assetAddress) {
      doc.registrations = [{ agentId: assetAddress, agentRegistry: 'solana:101:metaplex' }]
    }

    if (flags['save-document']) {
      fs.writeFileSync(flags['save-document'], JSON.stringify(doc, null, 2))
      this.log(`Document saved to ${flags['save-document']}`)
    }

    const uploadSpinner = ora('Uploading registration document...').start()
    const uri = await uploadJson(umi, doc).catch((err) => {
      uploadSpinner.fail(`Failed to upload document: ${err}`)
      throw err
    })
    uploadSpinner.succeed(`Document uploaded to ${uri}`)

    return { uri, document: doc }
  }

  private async runOnChain(args: Record<string, any>, flags: Record<string, any>): Promise<unknown> {
    const { umi, explorer, chain } = this.context

    // Determine asset address
    if (flags.wizard && !flags.new && !args.asset) {
      const assetMode = await select({
        message: 'Register a new asset or an existing one?',
        choices: [
          { name: 'Create a new Core asset', value: 'new' },
          { name: 'Use an existing Core asset', value: 'existing' },
        ],
      })

      if (assetMode === 'new') {
        flags.new = true
      } else {
        args.asset = await input({
          message: 'Existing Asset Address?',
          validate: (value: string) => value ? true : 'Asset address is required',
        })
      }
    }

    let assetAddress: string
    let assetSigner = flags.new ? generateSigner(umi) : undefined

    if (flags.new) {
      assetAddress = assetSigner!.publicKey.toString()
    } else {
      if (!args.asset) {
        this.error('Asset address is required. Provide an asset address or use --new to create one.')
      }
      assetAddress = args.asset
    }

    const { uri, document } = await this.resolveDocumentUri(flags, assetAddress)

    if (flags.new) {
      const assetName = document?.name ?? flags.name
      if (!assetName) {
        this.error('--name is required when using --new (or use --wizard)')
      }

      const assetSpinner = ora('Creating Core asset...').start()

      await createAssetFromArgs(umi, {
        assetSigner,
        name: assetName,
        uri,
        collection: flags.collection,
        owner: flags.owner,
      }).catch((err) => {
        assetSpinner.fail(`Failed to create asset: ${err}`)
        throw err
      })

      assetSpinner.succeed(`Core asset created: ${assetAddress}`)
    }

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
      registrationUri: uri,
      collection: flags.collection ?? null,
      signature,
      explorer: explorerUrl,
    }
  }

  // ─── API path ─────────────────────────────────────────────────────────────

  private async runApi(flags: Record<string, any>): Promise<unknown> {
    const { umi, explorer, chain } = this.context

    if (!flags.name) {
      this.error('--name is required for API registration')
    }
    if (!flags.description) {
      this.error('--description is required for API registration')
    }
    if (!flags.image) {
      this.error('--image is required for API registration')
    }

    const imageUri = await resolveImageUri(umi, flags.image)

    let services: Array<{ name: string; endpoint: string }> = []
    if (flags.services) {
      try {
        services = JSON.parse(flags.services) as Array<{ name: string; endpoint: string }>
      } catch {
        this.error('--services must be a valid JSON array, e.g. \'[{"name":"MCP","endpoint":"https://..."}]\'')
      }
    }

    let supportedTrust: string[] = []
    if (flags['supported-trust']) {
      try {
        supportedTrust = JSON.parse(flags['supported-trust']) as string[]
      } catch {
        this.error('--supported-trust must be a valid JSON array, e.g. \'["reputation","tee-attestation"]\'')
      }
    }

    const spinner = ora('Minting agent via Metaplex API...').start()

    try {
      const network = detectSvmNetwork(chain)

      const result = await mintAndSubmitAgent(umi, {}, {
        wallet: umi.identity.publicKey,
        network,
        name: flags.name,
        uri: imageUri,
        agentMetadata: {
          type: 'agent',
          name: flags.name,
          description: flags.description,
          services,
          registrations: [],
          supportedTrust,
        },
      })

      const signature = txSignatureToString(result.signature)

      spinner.succeed('Agent registered successfully via API')

      const explorerUrl = generateExplorerUrl(explorer, chain, signature, 'transaction')

      this.log(`--------------------------------
  Asset: ${result.assetAddress}
  Signature: ${signature}
  Explorer: ${explorerUrl}
--------------------------------`)

      return {
        asset: result.assetAddress,
        signature,
        explorer: explorerUrl,
      }
    } catch (err) {
      spinner.fail('Agent registration failed')

      if (isAgentValidationError(err)) {
        this.error(`Validation error on field "${(err as any).field}": ${(err as Error).message}`)
      } else if (isAgentApiNetworkError(err)) {
        this.error(`Network error: ${(err as Error).message}`)
      } else if (isAgentApiError(err)) {
        this.error(`API error (${(err as any).statusCode}): ${(err as Error).message}`)
      }
      throw err
    }
  }

  // ─── Entry point ──────────────────────────────────────────────────────────

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(AgentsRegister)

    // wizard and from-file always need the IX path (they need document upload)
    const useIx = flags['use-ix'] || flags.wizard || flags['from-file'] || args.asset

    if (useIx) {
      return this.runOnChain(args, flags)
    }

    return this.runApi(flags)
  }
}
