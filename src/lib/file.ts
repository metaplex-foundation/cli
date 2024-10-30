
import { mkdirSync, PathOrFileDescriptor, readFileSync, writeFileSync } from "fs";
import { jsonParse, jsonStringify } from "./util.js";

export function readJsonSync(path: PathOrFileDescriptor): any {
  return jsonParse(readFileSync(path).toString())
}

export function writeJsonSync(path: PathOrFileDescriptor, data: any): void {
  writeFileSync(path, jsonStringify(data, 2))
}

export const ensureDirectoryExists = (path: string) => {
  mkdirSync(path, { recursive: true });
}