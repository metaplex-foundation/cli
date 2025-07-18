import { Umi } from "@metaplex-foundation/umi"
import uploadFiles from "./uploadFiles.js"
import fs from 'node:fs'
import path from 'node:path'

const uploadDirectory = async (umi: Umi, directory: string, onProgress?: (progress: number) => void) => {
    
    // Validate that the directory exists and is accessible
    if (!fs.existsSync(directory)) {
        throw new Error(`Directory does not exist: ${directory}`)
    }

    try {
        // Check if the path is actually a directory and is accessible
        const stats = fs.statSync(directory)
        if (!stats.isDirectory()) {
            throw new Error(`Path is not a directory: ${directory}`)
        }
    } catch (error) {
        throw new Error(`Cannot access directory ${directory}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    try {
        // Read directory contents
        const files = await fs.promises.readdir(directory)
        
        // Convert filenames to full file paths
        const fullFilePaths = files.map(filename => path.join(directory, filename))
        
        const uploadResult = await uploadFiles(umi, fullFilePaths, onProgress)
        return uploadResult
    } catch (error) {
        throw new Error(`Failed to read directory ${directory}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
}

export default uploadDirectory