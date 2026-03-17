import { confirm, input, select } from '@inquirer/prompts'

export interface AgentService {
  name: string
  endpoint: string
  version?: string
  skills?: string[]
  domains?: string[]
}

export interface AgentRegistration {
  agentId: string
  agentRegistry: string
}

export const AGENT_REGISTRATION_TYPE = 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1'

export interface AgentRegistrationDocument {
  type: typeof AGENT_REGISTRATION_TYPE
  name: string
  description: string
  image: string
  services?: AgentService[]
  active?: boolean
  registrations?: AgentRegistration[]
  supportedTrust?: string[]
}

const SERVICE_TYPES = [
  { name: 'Other (custom)', value: 'other' },
  { name: 'Web', value: 'web' },
  { name: 'A2A (Agent-to-Agent)', value: 'A2A' },
  { name: 'MCP (Model Context Protocol)', value: 'MCP' },
  { name: 'OASF', value: 'OASF' },
  { name: 'DID', value: 'DID' },
  { name: 'Email', value: 'email' },
]

const TRUST_MODELS = [
  { name: 'Reputation', value: 'reputation' },
  { name: 'Crypto-economic', value: 'crypto-economic' },
  { name: 'TEE Attestation', value: 'tee-attestation' },
]

export interface AgentDocumentPromptResult {
  document: AgentRegistrationDocument
  collection?: string
}

const agentDocumentPrompt = async (): Promise<AgentDocumentPromptResult> => {
  const doc: AgentRegistrationDocument = {
    type: AGENT_REGISTRATION_TYPE,
    name: '',
    description: '',
    image: '',
  }

  doc.name = await input({
    message: 'Agent Name?',
    validate: (value) => value ? true : 'Name is required',
  })

  doc.description = await input({
    message: 'Agent Description?',
    validate: (value) => value ? true : 'Description is required',
  })

  const imageSource = await select({
    message: 'Agent Image — is it a local file or a URI?',
    choices: [
      { name: 'Local file (will be uploaded)', value: 'file' },
      { name: 'URI / URL (already hosted)', value: 'uri' },
    ],
  })

  if (imageSource === 'file') {
    doc.image = await input({
      message: 'Agent Image File Path?',
      validate: (value) => value ? true : 'File path is required',
    })
  } else {
    doc.image = await input({
      message: 'Agent Image URI? (URL to avatar/logo)',
      validate: (value) => value ? true : 'Image URI is required',
    })
  }

  // Services
  const addServices = await confirm({
    message: 'Add service endpoints?',
  })

  if (addServices) {
    doc.services = []
    let continueAdding = true

    while (continueAdding) {
      const serviceTypeSelection = await select({
        message: 'Service Type?',
        choices: SERVICE_TYPES,
      })

      const serviceType = serviceTypeSelection === 'other'
        ? await input({
            message: 'Custom Service Type Name?',
            validate: (value) => value ? true : 'Service type name is required',
          })
        : serviceTypeSelection

      const endpoint = await input({
        message: 'Service Endpoint URL?',
        validate: (value) => value ? true : 'Endpoint is required',
      })

      const service: AgentService = { name: serviceType, endpoint }

      const hasVersion = await confirm({
        message: 'Specify protocol version?',
        default: false,
      })

      if (hasVersion) {
        service.version = await input({
          message: 'Protocol Version?',
        })
      }

      const hasSkills = await confirm({
        message: 'Add skills for this service?',
        default: false,
      })

      if (hasSkills) {
        const skillsInput = await input({
          message: 'Skills (comma-separated)?',
        })
        service.skills = skillsInput.split(',').map(s => s.trim()).filter(Boolean)
      }

      const hasDomains = await confirm({
        message: 'Add domains for this service?',
        default: false,
      })

      if (hasDomains) {
        const domainsInput = await input({
          message: 'Domains (comma-separated)?',
        })
        service.domains = domainsInput.split(',').map(d => d.trim()).filter(Boolean)
      }

      doc.services.push(service)

      continueAdding = await confirm({
        message: 'Add another service?',
      })
    }
  }

  // Active status
  doc.active = await confirm({
    message: 'Is the agent currently active?',
    default: true,
  })

  // Trust models
  const addTrust = await confirm({
    message: 'Add supported trust models?',
    default: false,
  })

  if (addTrust) {
    doc.supportedTrust = []

    for (const model of TRUST_MODELS) {
      const include = await confirm({
        message: `Support ${model.name}?`,
        default: false,
      })
      if (include) {
        doc.supportedTrust.push(model.value)
      }
    }

    if (doc.supportedTrust.length === 0) {
      delete doc.supportedTrust
    }
  }

  // Collection
  const inCollection = await confirm({
    message: 'Is this agent part of a collection?',
    default: false,
  })

  const collection = inCollection
    ? await input({
        message: 'Collection Address?',
        validate: (value) => value ? true : 'Collection address is required',
      })
    : undefined

  return { document: doc, collection }
}

export default agentDocumentPrompt
