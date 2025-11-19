import { expect } from "chai"
import { runCli } from "../../runCli"

// Helper to strip ANSI color codes
const stripAnsi = (str: string): string => {
    let result = ''
    let i = 0
    while (i < str.length) {
        // Detect ESC character (char code 27 or '\x1b')
        if (str.charCodeAt(i) === 27) {
            if (str[i + 1] === '[') {
                // CSI sequence: skip ESC and '[', then skip until terminating 'm'
                i += 2
                while (i < str.length && str[i] !== 'm') {
                    i++
                }
                // Skip the terminating 'm'
                if (i < str.length && str[i] === 'm') {
                    i++
                }
            } else {
                // Other ESC sequence: skip ESC and next character
                i += 2
            }
        } else {
            // Regular character, append to result
            result += str[i]
            i++
        }
    }
    return result
}

// Helper to extract collection ID from message
const extractCollectionId = (str: string) => {
    const patterns = [
        /Collection: ([a-zA-Z0-9]+)/,
        /Collection created with ID: ([a-zA-Z0-9]+)/,
        /Core Collection Created.*?Collection: ([a-zA-Z0-9]+)/s,
    ]

    for (const pattern of patterns) {
        const match = str.match(pattern)
        if (match) return match[1]
    }
    return null
}

/**
 * Create a Bubblegum-compatible Core collection with BubblegumV2 plugin
 */
const createBubblegumCollection = async (options?: {
    name?: string
    uri?: string
    royalties?: number
}): Promise<{ collectionId: string; signature: string }> => {
    const cliInput = [
        'bg',
        'collection',
        'create',
        '--name',
        options?.name ?? 'Test Bubblegum Collection',
        '--uri',
        options?.uri ?? 'https://example.com/bg-collection.json',
    ]

    if (options?.royalties !== undefined) {
        cliInput.push('--royalties', String(options.royalties))
    }

    const { stdout, stderr, code } = await runCli(cliInput)

    const cleanStderr = stripAnsi(stderr)
    const cleanStdout = stripAnsi(stdout)
    const combined = cleanStdout + '\n' + cleanStderr

    const collectionId = extractCollectionId(combined)

    if (!collectionId) {
        console.log('Collection creation output:', combined)
        throw new Error('Collection ID not found in output')
    }

    // Extract signature
    const sigMatch = combined.match(/Transaction: ([a-zA-Z0-9]+)/)
    const signature = sigMatch ? sigMatch[1] : ''

    expect(code).to.equal(0)
    expect(combined).to.contain('Collection created with Bubblegum V2 plugin')
    expect(collectionId).to.match(/^[a-zA-Z0-9]+$/)

    return { collectionId, signature }
}

export { createBubblegumCollection, extractCollectionId, stripAnsi }
