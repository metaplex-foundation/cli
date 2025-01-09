import {TransactionSignature} from '@metaplex-foundation/umi'
import {createUmi} from '@metaplex-foundation/umi-bundle-defaults'
import {base58} from '@metaplex-foundation/umi/serializers'
import ChildProcess from 'node:child_process'
import os from 'node:os'
import path from 'node:path'

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

export const terminalColors = {
  FgDefault: '\x1b[0m',
  FgBlack: '\x1b[30m',
  FgRed: '\x1b[31m',
  FgGreen: '\x1b[32m',
  FgYellow: '\x1b[33m',
  FgBlue: '\x1b[34m',
  FgMagenta: '\x1b[35m',
  FgCyan: '\x1b[36m',
  FgWhite: '\x1b[37m',
  FgGray: '\x1b[90m',
  BgDefault: '\x1b[39m',
  BgBlack: '\x1b[40m',
  BgRed: '\x1b[41m',
  BgGreen: '\x1b[42m',
  BgYellow: '\x1b[43m',
  BgBlue: '\x1b[44m',
  BgMagenta: '\x1b[45m',
  BgCyan: '\x1b[46m',
  BgWhite: '\x1b[47m',
  BgGray: '\x1b[100m',
}

export const terminalStyle = {
  bold: '\x1b[1m',
  underline: '\x1b[4m',
  inverse: '\x1b[7m',
}

export const shortenAddress = (address: string, chars = 4): string => {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`
}
