import {publicKey, PublicKey, Signer, Transaction} from '@metaplex-foundation/umi'
import { default as TransportNodeHidSingleton } from "@ledgerhq/hw-transport-node-hid-singleton";
import { default as Solana } from '@ledgerhq/hw-app-solana';
import { PublicKey as Web3JsPublicKey } from '@solana/web3.js';

export const createSignerFromLedgerPath = async (path: string): Promise<Signer> => {
  const transport = await TransportNodeHidSingleton.default.create(10000, 10000);

  const solana = new Solana.default(transport);
  const pubkeyBuffer = await solana.getAddress(path);
  const w3Pubkey = new Web3JsPublicKey(pubkeyBuffer);
  const pubkey = publicKey(w3Pubkey)

  const signTx = async (tx: Transaction): Promise<Transaction> => {
    const result = await solana.signTransaction(path, Buffer.from(tx.serializedMessage))
    tx.signatures.push(result.signature)
    return tx;
  }

  return {
    get publicKey(): PublicKey {
      return pubkey
    },

    async signMessage(message: Uint8Array): Promise<Uint8Array> {
      const result = await solana.signOffchainMessage(path, Buffer.from(message))
      return result.signature
    },

    signTransaction: signTx,

    async signAllTransactions(
      transactions: Transaction[]
    ): Promise<Transaction[]> {
      return Promise.all(transactions.map(signTx))
    }
  }
}