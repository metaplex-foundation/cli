import { transactionBuilder } from '@metaplex-foundation/umi'
import { Flags } from '@oclif/core'
import ora from 'ora'

import { generateExplorerUrl } from '../../explorers.js'
import { TransactionCommand } from '../../TransactionCommand.js'
import { deserializeInstruction } from '../../lib/execute/deserializeInstruction.js'
import umiSendAndConfirmTransaction from '../../lib/umi/sendAndConfirm.js'
import { txSignatureToString } from '../../lib/util.js'

export default class ToolboxTransaction extends TransactionCommand<typeof ToolboxTransaction> {
  static override description = `Execute arbitrary base64-encoded Solana instructions.

Instructions are signed by the current wallet. When an asset-signer wallet is
active, they are automatically wrapped in an MPL Core execute instruction.

Use --instruction for each instruction to include (can be repeated).
Alternatively, pipe instructions via stdin with --stdin.`

  static override examples = [
    '<%= config.bin %> <%= command.id %> --instruction <base64EncodedInstruction>',
    '<%= config.bin %> <%= command.id %> --instruction <ix1> --instruction <ix2>',
    'echo "<base64>" | <%= config.bin %> <%= command.id %> --stdin',
  ]

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
    const { flags } = await this.parse(ToolboxTransaction)
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

    const spinner = ora('Deserializing instructions...').start()

    try {
      const instructions = instructionData.map((b64, idx) => {
        try {
          return deserializeInstruction(b64)
        } catch (error) {
          spinner.fail(`Failed to deserialize instruction ${idx + 1}`)
          this.error(`Failed to deserialize instruction ${idx + 1}: ${error}`)
        }
      })

      spinner.text = `Executing ${instructions.length} instruction(s)...`

      // bytesCreatedOnChain is 0 since we can't infer account creation from raw instructions
      const tx = instructions.reduce(
        (builder, ix) => builder.add({ instruction: ix, signers: [umi.identity], bytesCreatedOnChain: 0 }),
        transactionBuilder(),
      )

      const result = await umiSendAndConfirmTransaction(umi, tx)

      const { signature } = result.transaction
      if (signature === null) {
        throw new Error('Transaction signature is null')
      }

      const sig = typeof signature === 'string' ? signature : txSignatureToString(signature as Uint8Array)
      const explorerUrl = generateExplorerUrl(explorer, chain, sig, 'transaction')

      spinner.succeed(`Executed ${instructions.length} instruction(s)`)

      this.logSuccess(
        `--------------------------------
  Signer:         ${umi.identity.publicKey.toString()}
  Instructions:   ${instructions.length}
  Signature:      ${sig}
--------------------------------`
      )
      this.log(explorerUrl)

      return {
        signer: umi.identity.publicKey.toString(),
        instructionCount: instructions.length,
        signature: sig,
        explorer: explorerUrl,
      }
    } catch (error) {
      spinner.fail('Failed to execute instructions')
      throw error
    }
  }
}
