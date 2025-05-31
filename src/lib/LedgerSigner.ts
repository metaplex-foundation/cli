import { default as Solana } from '@ledgerhq/hw-app-solana';
import { default as TransportNodeHidSingleton } from "@ledgerhq/hw-transport-node-hid-singleton";
import {PublicKey, Signer, Transaction, addTransactionSignature, publicKey} from '@metaplex-foundation/umi'
import { PublicKey as Web3JsPublicKey } from '@solana/web3.js';

const extractNumberPattern = (str: string) => {
  const url = new URL(str);
  let key = url.searchParams.get('key');
  if (key) {
    // Remove leading and trailing quotes if any
    key = key.replaceAll(/^["']|["']$/g, '');
    const numberPattern = /^\d+(\/\d+){0,2}$/;
    if (numberPattern.test(key)) {
      return `/${key}`;
    } else {
      throw new Error(`Invalid ledger path: ${str}`)
    }
  }

  return "";
}

export const createSignerFromLedgerPath = async (path: string): Promise<Signer> => {
  const transport = await TransportNodeHidSingleton.default.create(10_000, 10_000);

  const dPath = `44/501${extractNumberPattern(path)}`

  const solana = new Solana.default(transport);
  const pubkeyBuffer = await solana.getAddress(dPath);
  const w3Pubkey = new Web3JsPublicKey(pubkeyBuffer.address);
  const pubkey = publicKey(w3Pubkey)

  const signTx = async (tx: Transaction): Promise<Transaction> => {
    const result = await solana.signTransaction(dPath, Buffer.from(tx.serializedMessage))
    return addTransactionSignature(tx, result.signature, pubkey)
  }

  return {
    get publicKey(): PublicKey {
      return pubkey
    },

    async signAllTransactions(
      transactions: Transaction[]
    ): Promise<Transaction[]> {
      return Promise.all(transactions.map((tx) => signTx(tx)))
    },

    async signMessage(message: Uint8Array): Promise<Uint8Array> {
      const result = await solana.signOffchainMessage(dPath, Buffer.from(message))
      return result.signature
    },

    signTransaction: signTx
  }
}