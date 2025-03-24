import { createGenericFile, Umi } from "@metaplex-foundation/umi"
import { readFile } from "../util.js"

const imageUploader = async (umi: Umi, image: string): Promise<string> => {
    const file = readFile(image)
    if (file.mimeType !== 'image/png' && file.mimeType !== 'image/jpg' && file.mimeType !== 'image/jpeg' && file.mimeType !== 'image/gif' && file.mimeType !== 'image/webp') {
        throw ("invalid image file type")
    }
    const genericFile = createGenericFile(file.file, file.fileName, { contentType: file.mimeType })

    const imageUri = await umi.uploader.upload([genericFile]).catch((err) => { throw (err) })
    return imageUri[0]
}

export default imageUploader
