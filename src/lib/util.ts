import { TransactionSignature } from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { base58 } from "@metaplex-foundation/umi/serializers";

export const txSignatureToString = (sig: TransactionSignature): string => {
  return base58.deserialize(sig)[0];
}

export const jsonStringify = (obj: any, spaces?: string | number) => {
  return JSON.stringify(obj, (_key, value) =>
    typeof value === 'bigint' ? `${value.toString()}n` : value, spaces);
}

export const jsonParse = (str: string) => {
  return JSON.parse(str, (_key, value) =>
    typeof value === 'string' && value.endsWith('n') ? BigInt(value.slice(0, -1)) : value);
}

// create a temporary umi to access eddsa/keygen methods
export const DUMMY_UMI = createUmi('https://api.devnet.solana.com')
