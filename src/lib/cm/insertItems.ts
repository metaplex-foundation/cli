import { addConfigLines } from "@metaplex-foundation/mpl-core-candy-machine";
import { publicKey, Umi } from "@metaplex-foundation/umi";
import umiSendAllTransactionsAndConfirm from "../umi/sendAllTransactionsAndConfirm.js";
import { CandyMachineAssetCache, CandyMachineAssetCacheItem, CandyMachineConfig } from "./types.js";
import validateCacheUploads, { ValidateCacheUploadsOptions } from "./validateCacheUploads.js";

const insertItems = async (umi: Umi, candyMachineConfig: CandyMachineConfig, assetCache: CandyMachineAssetCache) => {

    if (!candyMachineConfig.candyMachineId) {
        throw new Error('Config is missing candy machine ID. Did you run `mplx cm create`?')
    }

    await validateCacheUploads(assetCache, ValidateCacheUploadsOptions.STORAGE)

    // Check if all items are already loaded
    const allItemsLoaded = Object.values(assetCache.assetItems).every(item => item.loaded)
    if (allItemsLoaded) {
        console.log('📋 All items in the cache are marked as already loaded.')
        console.log('This could mean:')
        console.log('  • Items were previously inserted into a candy machine')
        console.log('  • You want to re-insert items into a new candy machine')
        console.log('  • There was an issue with the previous insertion')
        
        const { input } = await import('@inquirer/prompts')
        const reloadChoice = await input({
            message: 'Do you want to reload all items? (y/n or q to quit)',
            validate: (value) => true
        })
        
        if (reloadChoice.trim().toLowerCase() === 'q') {
            console.log('Aborting by user request.')
            process.exit(0)
        }
        
        if (reloadChoice.trim().toLowerCase() === 'y') {
            console.log('🔄 Resetting all items to unloaded status...')
            Object.values(assetCache.assetItems).forEach(item => {
                item.loaded = false
            })
            console.log('✅ All items reset. Proceeding with insertion...')
        } else {
            console.log('✅ Skipping insertion - all items already loaded.')
            return {
                transactionResults: [],
                assetCache
            }
        }
    }

    let maxUriLength = 0
    let maxNameLength = 0

    for (const item of Object.values(assetCache.assetItems)) {
        if (item.imageUri?.length && item.imageUri.length > maxUriLength) {
            maxUriLength = item.imageUri.length
        }
        if (item.name && item.name.length > maxNameLength) {
            maxNameLength = item.name.length
        }
    }

    // TODO: Double check this calculation
    const maxConfigLinesPerInstruction = Math.floor((1232 - 200) / (maxUriLength + maxNameLength + 50))

    const configLineGroups: { startingIndex: number, assetItems: CandyMachineAssetCacheItem[] }[] = []

    // Convert to array to ensure proper indexing
    const assetItemsArray = Object.entries(assetCache.assetItems).map(([key, item]) => ({
        index: Number(key),
        item
    })).sort((a, b) => a.index - b.index)

    let singleGroup: { startingIndex: number, assetItems: CandyMachineAssetCacheItem[] } = {
        startingIndex: 0,
        assetItems: []
    }

    for (let i = 0; i < assetItemsArray.length; i++) {
        const { index, item } = assetItemsArray[i]

        if (singleGroup.assetItems.length === 0) {
            singleGroup.startingIndex = index
        }

        singleGroup.assetItems.push(item)

        if (singleGroup.assetItems.length === maxConfigLinesPerInstruction || i === assetItemsArray.length - 1) {
            configLineGroups.push(singleGroup)
            singleGroup = { startingIndex: 0, assetItems: [] }
        }
    }

    const transactions = []
    const transactionGroupMap: { startingIndex: number, groupSize: number }[] = []

    for (const configLineGroup of configLineGroups) {
        // if all items are loaded into a group we can skip it
        if (configLineGroup.assetItems.every(item => item.loaded)) {
            continue
        }

        // else we need to add the config lines to the transaction
        const configLines = configLineGroup.assetItems.map(item => ({
            name: item.name,
            uri: item.imageUri!,
        }))

        const transaction = addConfigLines(umi, {
            candyMachine: publicKey(candyMachineConfig.candyMachineId),
            configLines,
            index: configLineGroup.startingIndex,
        })

        transactions.push(transaction)
        transactionGroupMap.push({
            startingIndex: configLineGroup.startingIndex,
            groupSize: configLineGroup.assetItems.length
        })
    }

    // TODO: Send transaction and handle result
    const transactionResults = await umiSendAllTransactionsAndConfirm(umi, transactions, {
        message: 'Uploading Assets to Candy Machine...',
    })

    // Update asset cache based on transaction results
    for (let i = 0; i < transactionResults.length; i++) {
        const result = transactionResults[i]
        const { startingIndex, groupSize } = transactionGroupMap[i]

        for (let assetIndex = startingIndex; assetIndex < startingIndex + groupSize; assetIndex++) {
            if (assetCache.assetItems[assetIndex]) {
                assetCache.assetItems[assetIndex].loaded = result.confirmation?.confirmed || false
            }
        }
    }

    // Items successfully inserted into candy machine

    return {
        transactionResults,
        assetCache
    }
}

export default insertItems