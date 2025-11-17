import ora, { Ora } from 'ora'
import { UploadProgress } from '../cm/uploadItems.js'

export function createUploadProgressHandler(): (progress: UploadProgress) => void {
    let imageSpinner: Ora | null = null
    let jsonSpinner: Ora | null = null
    let updateSpinner: Ora | null = null

    return (progress: UploadProgress) => {
        switch (progress.phase) {
            case 'images-start':
                imageSpinner = ora(progress.message).start()
                break
            case 'images':
                if (imageSpinner) imageSpinner.text = progress.message
                break
            case 'images-complete':
                if (imageSpinner) imageSpinner.succeed(progress.message)
                imageSpinner = null
                break

            case 'updating-json':
                updateSpinner = ora(progress.message).start()
                break

            case 'json-start':
                if (updateSpinner) {
                    updateSpinner.succeed('JSON files updated with image URIs')
                    updateSpinner = null
                }
                jsonSpinner = ora(progress.message).start()
                break
            case 'json':
                if (jsonSpinner) jsonSpinner.text = progress.message
                break
            case 'json-complete':
                if (jsonSpinner) jsonSpinner.succeed(progress.message)
                jsonSpinner = null
                break

            case 'complete':
                // All individual spinners should be completed by now
                break
        }
    }
}

export function createSimpleProgressHandler(): (progress: number) => void {
    let spinner: Ora | null = null
    
    return (progress: number) => {
        if (!spinner) {
            spinner = ora('Uploading assets...').start()
        }
        
        const percentage = Math.round(progress * 100)
        spinner.text = `Uploading assets... ${percentage}%`
        
        if (percentage >= 100) {
            spinner.succeed('Upload completed')
            spinner = null
        }
    }
} 