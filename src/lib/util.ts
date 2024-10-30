import { TransactionSignature } from "@metaplex-foundation/umi";
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