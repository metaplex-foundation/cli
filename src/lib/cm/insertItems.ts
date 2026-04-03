import { addConfigLines } from "@metaplex-foundation/mpl-core-candy-machine";
import { publicKey, TransactionBuilder, Umi } from "@metaplex-foundation/umi";
import umiSendAllTransactionsAndConfirm from "../umi/sendAllTransactionsAndConfirm.js";
import { ConfirmationStrategy } from "../umi/sendOptions.js";
import { CandyMachineAssetCache, CandyMachineAssetCacheItem, CandyMachineConfig } from "./types.js";
import { validateCacheUploads, ValidateCacheUploadsOptions } from "./validateCacheUploads.js";

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
            validate: (value) => {
                const trimmedValue = value.trim().toLowerCase()
                if (['y', 'n', 'q'].includes(trimmedValue)) {
                    return true
                }
                return 'Please enter y, n, or q'
            }
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

    // Only measure unloaded items since those are the ones we'll send
    for (const item of Object.values(assetCache.assetItems)) {
        if (item.loaded) continue
        if (item.jsonUri?.length && item.jsonUri.length > maxUriLength) {
            maxUriLength = item.jsonUri.length
        }
        if (item.name && item.name.length > maxNameLength) {
            maxNameLength = item.name.length
        }
    }

    // TODO: Double check this calculation
    const maxConfigLinesPerInstruction = Math.floor((1232 - 200) / (maxUriLength + maxNameLength + 50))

    // Filter to only unloaded items, then group into contiguous runs
    // respecting maxConfigLinesPerInstruction. This avoids resubmitting
    // already-loaded items when resuming after a partial failure.
    const unloadedItems = Object.entries(assetCache.assetItems)
        .map(([key, item]) => ({ index: Number(key), item }))
        .filter(({ item }) => !item.loaded)
        .sort((a, b) => a.index - b.index)

    const configLineGroups: { startingIndex: number, items: { index: number, item: CandyMachineAssetCacheItem }[] }[] = []
    let currentGroup: typeof configLineGroups[number] | null = null

    for (const entry of unloadedItems) {
        const isContiguous = currentGroup &&
            entry.index === currentGroup.startingIndex + currentGroup.items.length &&
            currentGroup.items.length < maxConfigLinesPerInstruction

        if (isContiguous) {
            currentGroup!.items.push(entry)
        } else {
            if (currentGroup) configLineGroups.push(currentGroup)
            currentGroup = { startingIndex: entry.index, items: [entry] }
        }
    }
    if (currentGroup) configLineGroups.push(currentGroup)

    // Build addConfigLines instructions for each group, then pack as many
    // instructions as possible into each transaction to minimize tx count.
    const instructions: { builder: TransactionBuilder, startingIndex: number, groupSize: number }[] = []

    for (const group of configLineGroups) {
        for (const { index, item } of group.items) {
            if (!item.name || item.name.trim() === '') {
                throw new Error(
                    `Item at index ${index} is missing required field 'name'. ` +
                    `Item details: ${JSON.stringify({ jsonUri: item.jsonUri, imageUri: item.imageUri })}`
                );
            }

            if (!item.jsonUri || item.jsonUri.trim() === '') {
                throw new Error(
                    `Item at index ${index} is missing required field 'jsonUri'. ` +
                    `Item details: ${JSON.stringify({ name: item.name, imageUri: item.imageUri })}`
                );
            }
        }

        const configLines = group.items.map(({ item }) => ({
            name: item.name,
            uri: item.jsonUri as string,
        }))

        instructions.push({
            builder: addConfigLines(umi, {
                candyMachine: publicKey(candyMachineConfig.candyMachineId),
                configLines,
                index: group.startingIndex,
            }),
            startingIndex: group.startingIndex,
            groupSize: group.items.length,
        })
    }

    // Greedily pack instructions into transactions
    const transactions: TransactionBuilder[] = []
    const transactionGroupMap: { startingIndex: number, groupSize: number }[][] = []

    let currentTx: TransactionBuilder | null = null
    let currentGroups: { startingIndex: number, groupSize: number }[] = []

    for (const ix of instructions) {
        const merged: TransactionBuilder = currentTx ? currentTx.add(ix.builder) : ix.builder

        if (merged.fitsInOneTransaction(umi)) {
            currentTx = merged
            currentGroups.push({ startingIndex: ix.startingIndex, groupSize: ix.groupSize })
        } else {
            if (currentTx) {
                transactions.push(currentTx)
                transactionGroupMap.push(currentGroups)
            }
            currentTx = ix.builder
            currentGroups = [{ startingIndex: ix.startingIndex, groupSize: ix.groupSize }]
        }
    }
    if (currentTx) {
        transactions.push(currentTx)
        transactionGroupMap.push(currentGroups)
    }

    const transactionResults = await umiSendAllTransactionsAndConfirm(umi, transactions, {
        message: 'Uploading Assets to Candy Machine...',
        confirmationStrategy: ConfirmationStrategy.transactionStatus,
    })

    // Update asset cache based on transaction results
    for (let i = 0; i < transactionResults.length; i++) {
        const result = transactionResults[i]
        const groups = transactionGroupMap[i]

        for (const { startingIndex, groupSize } of groups) {
            for (let assetIndex = startingIndex; assetIndex < startingIndex + groupSize; assetIndex++) {
                if (assetCache.assetItems[assetIndex]) {
                    assetCache.assetItems[assetIndex].loaded = result.confirmation?.confirmed || false
                }
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