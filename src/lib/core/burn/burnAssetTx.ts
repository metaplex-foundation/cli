import { burn, burnV1, fetchAsset, fetchCollection } from '@metaplex-foundation/mpl-core'
import { publicKey, TransactionBuilder, Umi } from '@metaplex-foundation/umi'

const burnAssetTx = async (umi: Umi, assetId: string, collectionId?: string): Promise<TransactionBuilder | null> => {
  // Reason to use burnV1 is to save on RPC calls on fetching both the Asset and the collection if collection is known.
  // For mass burns this would likely trigger a rate limit fetching both the asset and collection.

  if (collectionId) {
    // If Collection Id is provided, burn the asset using the burnV1 method

    return burnV1(umi, { asset: publicKey(assetId), collection: publicKey(collectionId) })
  } else {
    // If Collection Id is not provided, fetch the asset and collection and burn the asset using the burn method

    const asset = await fetchAsset(umi, publicKey(assetId))


    // TODO - handle error better
    // return burnV1 if there was an error fetching the asset
    if (!asset) {
      return burnV1(umi, { asset: publicKey(assetId) })
    }

    let collection

    if (asset.updateAuthority.type === 'Collection' && asset.updateAuthority.address) {
      collection = await fetchCollection(umi, publicKey(asset.updateAuthority.address))
    }

    return burn(umi, { asset, collection: collection })
  }
}

export default burnAssetTx
