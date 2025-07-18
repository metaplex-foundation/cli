import fs from 'node:fs'
import path from 'node:path'

export type ValidateAssetsResult =
  | {
      error: string
    }
  | {
      jsonFiles: string[]
      imageFiles: string[]
      animationFiles: string[]
      collectionFiles: { json: string | undefined; image: string | undefined }
    }

const validateAssetsFolder = async (assetsFolder: string): Promise<ValidateAssetsResult> => {
    const files = fs.readdirSync(assetsFolder)

    // we should have 3-4 different sets of files
    // 1. json files
    // 2. image files
    // 3. animation files
    // 4. collection files consisting of a json and an image file

    const jsonFiles = []
    const imageFiles = []
    const animationFiles = []

    // extract collection files from array to not confuse validations
    const collectionFiles: { json: string | undefined, image: string | undefined } = {
        json: files.find(file => file.endsWith('collection.json')),
        image: files.find(file => file.endsWith('collection.png') || file.endsWith('collection.jpg') || file.endsWith('collection.jpeg'))
    }


    for (const file of files) {
        if (file.startsWith('collection')) {
            continue
        }

        if (file.endsWith('.json')) {
            jsonFiles.push(file)
        } else if (file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.gif')) {
            imageFiles.push(file)
        } else if (
            file.endsWith('.mp4') ||
            file.endsWith('.webm') ||
            file.endsWith('.mov') ||
            file.endsWith('html') ||
            file.endsWith('glb') ||
            file.endsWith('gltf') ||
            file.endsWith('mp3') ||
            file.endsWith('wav') ||
            file.endsWith('ogg')) {
            animationFiles.push(file)
        }
    }

    // validate that we have at least one json file
    if (jsonFiles.length === 0) {
        return { error: 'No json files found in the assets folder' }
    }

    // validate that we have at least one image file
    if (imageFiles.length === 0) {
        return { error: 'No image files found in the assets folder' }
    }

    //validate the image files and json files are the same length
    if (imageFiles.length !== jsonFiles.length) {
        return { error: 'The number of image files and json files are not the same' }
    }

    // validate that files are named incrementing from 0 to the length of the files
    // Sort files numerically to ensure proper order
    const sortedImageFiles = imageFiles.sort((a, b) => {
        const aNum = Number.parseInt(a.split('.')[0])
        const bNum = Number.parseInt(b.split('.')[0])
        if (isNaN(aNum) || isNaN(bNum)) {
            return a.localeCompare(b)
        }
        return aNum - bNum
    })

    const sortedJsonFiles = jsonFiles.sort((a, b) => {
        const aNum = Number.parseInt(a.split('.')[0])
        const bNum = Number.parseInt(b.split('.')[0])
        if (isNaN(aNum) || isNaN(bNum)) {
            return a.localeCompare(b)
        }
        return aNum - bNum
    })

    for (let i = 0; i < sortedImageFiles.length; i++) {
        const expectedJson = `${i}.json`
        const actualImage = sortedImageFiles[i]
        const actualJson = sortedJsonFiles[i]

        // Check if the image file has the correct numeric name with any supported extension
        const imageBaseName = actualImage.split('.')[0]
        const imageExtension = actualImage.split('.').pop()?.toLowerCase()
        const supportedExtensions = ['png', 'jpg', 'jpeg', 'gif']
        
        const isValidImageName = imageBaseName === i.toString() && supportedExtensions.includes(imageExtension || '')

        if (!isValidImageName || actualJson !== expectedJson) {
            console.log(`Debug - Mismatch at index ${i}:`)
            console.log(`  Expected image: ${i}.<png|jpg|jpeg|gif>, got: ${actualImage}`)
            console.log(`  Expected json: ${expectedJson}, got: ${actualJson}`)
            return { error: 'The image or json files are not named incrementing from 0 to the length of the files' }
        }
    }

    return {
        jsonFiles,
        imageFiles,
        animationFiles,
        collectionFiles,
    }
}

export default validateAssetsFolder