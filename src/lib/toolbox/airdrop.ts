import { publicKey, sol, Umi } from "@metaplex-foundation/umi"
import { MAINNET_GENESIS_HASH } from "../../constants.js"

const umiAirdrop = async (
    umi: Umi,
    amount: number,
    address?: string,
): Promise<string> => {

    const isMainnet = async () => {

        const genesisHash = await umi.rpc.getGenesisHash()

        if (genesisHash === MAINNET_GENESIS_HASH) {
            return true
        }

        return false
    }

    if (await isMainnet()) {
        throw new Error('Airdropping SOL is not supported on Mainnet')
    }

    await umi.rpc.airdrop(
        address ? publicKey(address) : umi.identity.publicKey,
        sol(amount)
    ).catch((err) => {
        console.error(err)
        throw err
    })

    return 'Airdrop sent'
}

export default umiAirdrop
