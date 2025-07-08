import { Umi } from "@metaplex-foundation/umi"
import uploadFiles from "./uploadFiles.js"
import fs from 'node:fs'

const uploadDirectory = async (umi: Umi, directory: string, onProgress?: (progress: number) => void) => {
    
    const files = fs.readdirSync(directory)
    const uploadResult = await uploadFiles(umi, files, onProgress)
    return uploadResult
}

export default uploadDirectory