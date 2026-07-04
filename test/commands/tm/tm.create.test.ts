import { expect } from 'chai'
import fs from 'node:fs'
import os from 'node:os'
import { join } from 'node:path'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { generateSigner } from '@metaplex-foundation/umi'
import { runCli, TEST_RPC } from '../../runCli'
import { stripAnsi } from './tmhelpers'

const extractMintAddress = (str: string) => {
    const match = str.match(/NFT: ([a-zA-Z0-9]+)/)
    return match ? match[1] : null
}

describe('tm create command', () => {
    before(async () => {
        await runCli(['toolbox', 'sol', 'airdrop', '100', 'TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx'])
        await new Promise(resolve => setTimeout(resolve, 10000))
    })

    it('creates an NFT with a vanity --mint-keypair', async () => {
        const umi = createUmi(TEST_RPC)
        const mintKeypair = generateSigner(umi)
        const mintKeypairPath = join(os.tmpdir(), `mplx-test-mint-${Date.now()}.json`)
        fs.writeFileSync(mintKeypairPath, JSON.stringify(Array.from(mintKeypair.secretKey)))

        try {
            const { stdout, stderr, code } = await runCli([
                'tm', 'create',
                '--name', 'Vanity NFT',
                '--uri', 'https://example.com/vanity-nft.json',
                '--type', 'nft',
                '--mint-keypair', mintKeypairPath,
            ])

            const cleanStderr = stripAnsi(stderr)
            const cleanStdout = stripAnsi(stdout)
            const mintAddress = extractMintAddress(cleanStdout) || extractMintAddress(cleanStderr)

            expect(code).to.equal(0)
            expect(cleanStderr).to.contain('NFT created successfully')
            expect(mintAddress).to.equal(mintKeypair.publicKey.toString())
        } finally {
            fs.unlinkSync(mintKeypairPath)
        }
    })
})
