import {
  AddBlockerPlugin,
  AttributesPlugin,
  AutographPlugin,
  BasePlugin,
  BurnDelegatePlugin,
  EditionPlugin,
  FreezeDelegatePlugin,
  ImmutableMetadataPlugin,
  MasterEditionPlugin,
  PermanentBurnDelegatePlugin,
  PermanentFreezeDelegatePlugin,
  PermanentTransferDelegatePlugin,
  RoyaltiesPlugin,
  TransferDelegatePlugin,
  UpdateDelegatePlugin,
  VerifiedCreatorsPlugin,
} from '@metaplex-foundation/mpl-core'

export type Plugin =
  | 'royalties'
  | 'pBurn'
  | 'pTransfer'
  | 'pFreeze'
  | 'autograph'
  | 'freeze'
  | 'transfer'
  | 'burn'
  | 'update'
  | 'masterEdition'
  | 'attributes'
  | 'addBlocker'
  | 'immutableMetadata'
  | 'autograph'
  | 'verifiedCreators'
  | 'edition'

export interface PluginData {
  attributes?: {
    type: 'Attributes'
  } & BasePlugin &
    AttributesPlugin
  royalties?: {
    type: 'Royalties'
  } & BasePlugin &
    RoyaltiesPlugin
  burn?: {
    type: 'BurnDelegate'
  } & BasePlugin &
    BurnDelegatePlugin
  transfer?: {
    type: 'TransferDelegate'
  } & BasePlugin &
    TransferDelegatePlugin
  freeze?: {
    type: 'FreezeDelegate'
  } & BasePlugin &
    FreezeDelegatePlugin
  pBurn?: {
    type: 'PermanentBurnDelegate'
  } & BasePlugin &
    PermanentBurnDelegatePlugin
  pTranfer?: {
    type: 'PermanentTransferDelegate'
  } & BasePlugin &
    PermanentTransferDelegatePlugin
  pFreeze?: {
    type: 'PermanentFreezeDelegate'
  } & BasePlugin &
    PermanentFreezeDelegatePlugin
  update?: {
    type: 'UpdateDelegate'
  } & BasePlugin &
    UpdateDelegatePlugin
  masterEdition?: {
    type: 'MasterEdition'
  } & BasePlugin &
    MasterEditionPlugin
  addBlocker?: {
    type: 'AddBlocker'
  } & BasePlugin &
    AddBlockerPlugin
  immutableMetadata?: {
    type: 'ImmutableMetadata'
  } & BasePlugin &
    ImmutableMetadataPlugin
  authograph?: {
    type: 'Autograph'
  } & BasePlugin &
    AutographPlugin
  verifiedCreators?: {
    type: 'VerifiedCreators'
  } & BasePlugin &
    VerifiedCreatorsPlugin
  edition?: {
    type: 'Edition'
  } & BasePlugin &
    EditionPlugin
}
