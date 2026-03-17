import { execute, fetchAsset, fetchCollection, findAssetSignerPda } from '@metaplex-foundation/mpl-core'
import { publicKey } from '@metaplex-foundation/umi'
import { Args, Flags } from '@oclif/core'
import ora from 'ora'

import { generateExplorerUrl } from '../../../../explorers.js'
import { TransactionCommand } from '../../../../TransactionCommand.js'
import { txSignatureToString } from '../../../../lib/util.js'
import { deserializeInstruction } from '../../../../lib/execute/deserializeInstruction.js'

export default class ExecuteRaw extends TransactionCommand<typeof ExecuteRaw> {
  static override description = `Execute arbitrary instructions signed by an asset's signer PDA.

Instructions must be base64-encoded serialized Solana instructions.
Each instruction should be constructed with the asset's signer PDA as the signer.

Use --instruction for each instruction to include (can be repeated).
Alternatively, pipe instructions via stdin with --stdin.`

  static override examples = [
    '<%= config.bin %> <%= command.id %> <assetId> --instruction <base64EncodedInstruction>',
    '<%= config.bin %> <%= command.id %> <assetId> --instruction <ix1> --instruction <ix2>',
    'echo "<base64>" | <%= config.bin %> <%= command.id %> <assetId> --stdin',
  ]

  static override args = {
    assetId: Args.string({ description: 'Asset whose signer PDA will sign the instructions', required: true }),
  }

  static override flags = {
    instruction: Flags.string({
      char: 'i',
      description: 'Base64-encoded instruction (can be repeated)',
      multiple: true,
    }),
    stdin: Flags.boolean({
      description: 'Read base64-encoded instructions from stdin (one per line)',
      exclusive: ['instruction'],
    }),
  }

  private async readStdin(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      let data = ''
      process.stdin.setEncoding('utf8')
      process.stdin.on('data', (chunk) => { data += chunk })
      process.stdin.on('end', () => {
        const lines = data.split('\n').map(l => l.trim()).filter(l => l.length > 0)
        resolve(lines)
      })
      process.stdin.on('error', reject)
    })
  }

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(ExecuteRaw)
    const { umi, explorer, chain } = this.context

    let instructionData: string[]

    if (flags.stdin) {
      instructionData = await this.readStdin()
    } else if (flags.instruction && flags.instruction.length > 0) {
      instructionData = flags.instruction
    } else {
      this.error('You must provide instructions via --instruction or --stdin')
    }

    if (instructionData.length === 0) {
      this.error('No instructions provided')
    }

    const spinner = ora('Fetching asset...').start()

    try {
      const assetPubkey = publicKey(args.assetId)
      const asset = await fetchAsset(umi, assetPubkey)

      let collection
      if (asset.updateAuthority.type === 'Collection' && asset.updateAuthority.address) {
        collection = await fetchCollection(umi, asset.updateAuthority.address)
      }

      const [assetSignerPda] = findAssetSignerPda(umi, { asset: assetPubkey })

      spinner.text = 'Deserializing instructions...'

      const instructions = instructionData.map((b64, idx) => {
        try {
          return deserializeInstruction(b64)
        } catch (error) {
          spinner.fail(`Failed to deserialize instruction ${idx + 1}`)
          this.error(`Failed to deserialize instruction ${idx + 1}: ${error}`)
        }
      })

      spinner.text = `Executing ${instructions.length} instruction(s)...`

      const result = await execute(umi, {
        asset,
        collection,
        instructions,
      }).sendAndConfirm(umi)

      const signature = txSignatureToString(result.signature)
      const explorerUrl = generateExplorerUrl(explorer, chain, signature, 'transaction')

      spinner.succeed(`Executed ${instructions.length} instruction(s) via asset signer`)

      this.logSuccess(
        `--------------------------------
  Asset:          ${args.assetId}
  Signer PDA:     ${assetSignerPda.toString()}
  Instructions:   ${instructions.length}
  Signature:      ${signature}
--------------------------------`
      )
      this.log(explorerUrl)

      return {
        asset: args.assetId,
        signerPda: assetSignerPda.toString(),
        instructionCount: instructions.length,
        signature,
        explorer: explorerUrl,
      }
    } catch (error) {
      spinner.fail('Failed to execute instructions')
      throw error
    }
  }
}
