import { expect } from 'chai'

import { createTempKeypairFile } from '../../helpers/temp-keypair-file'
import { runCli } from '../../runCli'
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
        const { cleanup, mintKeypair, mintKeypairPath } = createTempKeypairFile()

        try {
            const { code, stderr, stdout } = await runCli([
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
            cleanup()
        }
    })
})
