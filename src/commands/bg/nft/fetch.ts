import { Args, Flags as OclifFlags } from '@oclif/core'
import ora from 'ora'
import { publicKey, PublicKey } from '@metaplex-foundation/umi'
import util from 'node:util'
import fs from 'node:fs'
import { join } from 'node:path'

import { BaseCommand } from '../../../BaseCommand.js'
import type { Flags as CommandFlags } from '../../../BaseCommand.js'
import { jsonStringify } from '../../../lib/util.js'
import { ensureDirectoryExists } from '../../../lib/file.js'

interface DasAsset {
  interface: string
  id: string
  content: {
    $schema: string
    json_uri: string
    files?: Array<{ uri?: string; mime?: string }>
    metadata: {
      name: string
      symbol: string
      description?: string
      token_standard?: string
    }
    links?: {
      image?: string
      external_url?: string
    }
  }
  authorities: Array<{
    address: string
    scopes: string[]
  }>
  compression: {
    eligible: boolean
    compressed: boolean
    data_hash: string
    creator_hash: string
    asset_hash: string
    tree: string
    seq: number
    leaf_id: number
  }
  grouping: Array<{
    group_key: string
    group_value: string
  }>
  royalty: {
    royalty_model: string
    target: null | string
    percent: number
    basis_points: number
    primary_sale_happened: boolean
    locked: boolean
  }
  creators: Array<{
    address: string
    share: number
    verified: boolean
  }>
  ownership: {
    frozen: boolean
    delegated: boolean
    delegate: null | string
    ownership_model: string
    owner: string
  }
  supply: {
    print_max_supply: number
    print_current_supply: number
    edition_nonce: number | null
  }
  mutable: boolean
  burnt: boolean
}

interface DasAssetProof {
  root: string
  proof: string[]
  node_index: number
  leaf: string
  tree_id: string
}

interface DasApiResponse<T> {
  jsonrpc: string
  result: T
  id: string
}

export default class BgNftFetch extends BaseCommand<typeof BgNftFetch> {
  static override description = `Fetch a Bubblegum compressed NFT using DAS (Digital Asset Standard) API.

This command retrieves the asset data and merkle proof for a compressed NFT.
The proof is required for any write operations (transfer, burn, etc.).`

  static override summary = 'Fetch a compressed NFT with its merkle proof'

  static override examples = [
    '$ mplx bg nft fetch <assetId>',
    '$ mplx bg nft fetch <assetId> --download',
    '$ mplx bg nft fetch <assetId> --download --output ./nfts',
    '$ mplx bg nft fetch <assetId> --proof-only',
  ]

  static override args = {
    assetId: Args.string({
      description: 'The compressed NFT asset ID (leaf asset ID)',
      required: true,
    }),
  }

  static override flags = {
    download: OclifFlags.boolean({
      description: 'Download asset data and proof to files',
      required: false,
    }),
    output: OclifFlags.string({
      description: 'Directory path where to save the downloaded files',
      required: false,
      dependsOn: ['download'],
    }),
    'proof-only': OclifFlags.boolean({
      description: 'Only fetch and display the merkle proof',
      required: false,
    }),
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(BgNftFetch)
    const { umi } = this.context

    // Validate asset ID
    let assetPubkey: PublicKey
    try {
      assetPubkey = publicKey(args.assetId)
    } catch {
      this.error(`Invalid asset ID: ${args.assetId}`)
    }

    const rpcUrl = umi.rpc.getEndpoint()

    if (flags['proof-only']) {
      await this.fetchProofOnly(rpcUrl, args.assetId, flags)
    } else {
      await this.fetchAssetAndProof(rpcUrl, args.assetId, flags)
    }
  }

  private async fetchProofOnly(
    rpcUrl: string,
    assetId: string,
    flags: CommandFlags<typeof BgNftFetch>,
  ): Promise<void> {
    const spinner = ora('Fetching asset proof...').start()

    try {
      const proof = await this.getAssetProof(rpcUrl, assetId)
      spinner.succeed('Asset proof fetched successfully')

      if (flags.download) {
        const baseDirectory = flags.output || process.cwd()
        ensureDirectoryExists(baseDirectory)

        fs.writeFileSync(
          join(baseDirectory, `${assetId}-proof.json`),
          jsonStringify(proof, 2)
        )

        this.log(`\nProof saved to: ${baseDirectory}/${assetId}-proof.json`)
      } else {
        this.log('\nAsset Proof:')
        console.log(util.inspect(proof, false, null, true))
      }
    } catch (error) {
      spinner.fail('Failed to fetch asset proof')
      throw error
    }
  }

  private async fetchAssetAndProof(
    rpcUrl: string,
    assetId: string,
    flags: CommandFlags<typeof BgNftFetch>,
  ): Promise<void> {
    const spinner = ora('Fetching compressed NFT data...').start()

    try {
      // Fetch both asset and proof in parallel
      const [asset, proof] = await Promise.all([
        this.getAsset(rpcUrl, assetId),
        this.getAssetProof(rpcUrl, assetId),
      ])

      spinner.succeed('Compressed NFT fetched successfully')

      if (flags.download) {
        const baseDirectory = flags.output || process.cwd()
        ensureDirectoryExists(baseDirectory)

        // Save asset data
        fs.writeFileSync(
          join(baseDirectory, `${assetId}-asset.json`),
          jsonStringify(asset, 2)
        )

        // Save proof
        fs.writeFileSync(
          join(baseDirectory, `${assetId}-proof.json`),
          jsonStringify(proof, 2)
        )

        this.log(`\n--------------------------------`)
        this.log(`Asset ID: ${assetId}`)
        this.log(`Files saved to: ${baseDirectory}`)
        this.log(`  - ${assetId}-asset.json`)
        this.log(`  - ${assetId}-proof.json`)
        this.log(`--------------------------------`)
      } else {
        this.printAssetSummary(asset, proof)
      }

      if (this.jsonEnabled()) {
        this.logJson({ asset, proof })
      }
    } catch (error) {
      spinner.fail('Failed to fetch compressed NFT')
      throw error
    }
  }

  private async getAsset(rpcUrl: string, assetId: string): Promise<DasAsset> {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'mplx-cli',
        method: 'getAsset',
        params: {
          id: assetId,
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`DAS API request failed: ${response.statusText}`)
    }

    const data: DasApiResponse<DasAsset> = await response.json()

    if (!data.result) {
      throw new Error('Asset not found or RPC does not support DAS API')
    }

    return data.result
  }

  private async getAssetProof(rpcUrl: string, assetId: string): Promise<DasAssetProof> {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'mplx-cli',
        method: 'getAssetProof',
        params: {
          id: assetId,
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`DAS API request failed: ${response.statusText}`)
    }

    const data: DasApiResponse<DasAssetProof> = await response.json()

    if (!data.result) {
      throw new Error('Asset proof not found or RPC does not support DAS API')
    }

    return data.result
  }

  private printAssetSummary(asset: DasAsset, proof: DasAssetProof): void {
    this.log(`
--------------------------------
Compressed NFT Details

Asset ID: ${asset.id}
Name: ${asset.content.metadata.name}
Symbol: ${asset.content.metadata.symbol}
${asset.content.metadata.description ? `Description: ${asset.content.metadata.description}\n` : ''}
Compressed: ${asset.compression.compressed}
Tree: ${asset.compression.tree}
Leaf ID: ${asset.compression.leaf_id}
Owner: ${asset.ownership.owner}
${asset.grouping.length > 0 ? `Collection: ${asset.grouping[0].group_value}\n` : ''}
Metadata URI: ${asset.content.json_uri}
${asset.content.links?.image ? `Image: ${asset.content.links.image}\n` : ''}
Mutable: ${asset.mutable}
Burnt: ${asset.burnt}

Merkle Proof:
  Root: ${proof.root}
  Node Index: ${proof.node_index}
  Proof Length: ${proof.proof.length} nodes
  Tree ID: ${proof.tree_id}

Royalty:
  Basis Points: ${asset.royalty.basis_points} (${asset.royalty.percent}%)
  Primary Sale: ${asset.royalty.primary_sale_happened ? 'Yes' : 'No'}

Creators:
${asset.creators.map((c) => `  ${c.address} (${c.share}%) ${c.verified ? '✓' : '✗'}`).join('\n')}

--------------------------------`)
  }
}
