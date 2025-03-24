import { TransactionSignature } from '@metaplex-foundation/umi'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { base58 } from '@metaplex-foundation/umi/serializers'
import ChildProcess from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import mime from 'mime'

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const txSignatureToString = (sig: TransactionSignature): string => base58.deserialize(sig)[0]

export const jsonStringify = (obj: any, spaces?: number | string) =>
  JSON.stringify(obj, (_key, value) => (typeof value === 'bigint' ? `${value.toString()}n` : value), spaces)

export const jsonParse = (str: string, parseBigint: boolean = false) => {
  if (parseBigint) {
    return JSON.parse(str, (_key, value) => {
      if (typeof value === 'string' && value.endsWith('n')) {
        const bigintStr = value.slice(0, -1)
        if (/^[+-]?\d+$/.test(bigintStr)) {
          return BigInt(bigintStr)
        }
      }

      return value
    })
  }

  return JSON.parse(str)
}

// create a temporary umi to access eddsa/keygen methods
export const DUMMY_UMI = createUmi('https://api.devnet.solana.com')

// open directory in file explorer

export const openDirectory = (folderPath: string): void => {
  const platform = os.platform() // Determine the platform
  console.log('platform:', platform)

  // Normalize the folder path
  const normalizedPath = path.normalize(folderPath)

  // Command to open a folder based on the platform
  let command
  if (platform === 'win32') {
    command = `start "" "${normalizedPath}"` // Windows
  } else if (platform === 'darwin') {
    command = `open "${normalizedPath}"` // macOS
  } else if (platform === 'linux') {
    command = `xdg-open "${normalizedPath}"` // Linux
  } else {
    console.error('Unsupported platform:', platform)
    return
  }

  // Execute the command
  ChildProcess.exec(command, (error) => {
    if (error) {
      console.error('Failed to open directory:', error)
    }
  })
}

export const readFile = (relativeFilePath: string) => {
  const fileName = path.basename(relativeFilePath)
  const currentDir = process.cwd()
  const filePath = path.resolve(currentDir, relativeFilePath)
  const mimeType = mime.getType(filePath)
  const file = fs.readFileSync(filePath)
  return {
    fileName,
    file,
    mimeType,
  }
}



export const terminalStyle = {
  bold: '\x1b[1m',
  underline: '\x1b[4m',
  inverse: '\x1b[7m',
}

export const shortenAddress = (address: string, chars = 4): string => {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`
}
