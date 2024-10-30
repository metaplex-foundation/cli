
import { mkdirSync, PathOrFileDescriptor, readFileSync, writeFileSync } from "fs";

export function readJsonSync(path: PathOrFileDescriptor): any {
  return JSON.parse(readFileSync(path).toString())
}

export function writeJsonSync(path: PathOrFileDescriptor, data: any): void {
  // TODO handle bigint serialization
  writeFileSync(path, JSON.stringify(data, null, 2))
}

export const ensureDirectoryExists = (path: string) => {
  mkdirSync(path, { recursive: true });
}