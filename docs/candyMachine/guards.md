# Candy Machine Guards

Candy Machine guards are rules and restrictions that control how users can mint NFTs from your candy machine. Guards can be applied globally to the entire candy machine or to specific groups for different minting phases.

## Guard Configuration Structure

Guards are configured in the `guardConfig` section of your candy machine configuration:

```json
{
  "guardConfig": {
    "solPayment": {
      "lamports": 1000000000,
      "destination": "111111111111111111111111111111111"
    },
    "mintLimit": {
      "id": 1,
      "limit": 1
    }
  }
}
```

## Payment Guards

### Sol Payment
Requires users to pay SOL to mint.

```javascript
{
  solPayment: {
    lamports: 1000000000,        // Amount in lamports (1 SOL = 1,000,000,000 lamports)
    destination: "111111111111111111111111111111111"  // Wallet address to receive payment
  }
}
```

### Sol Fixed Fee
Similar to solPayment but with different implementation.

```javascript
{
  solFixedFee: {
    lamports: 1000000000,        // Amount in lamports
    destination: "111111111111111111111111111111111"  // Wallet address to receive payment
  }
}
```

### Token Payment (SPL Token)
Requires users to pay with SPL tokens.

```javascript
{
  tokenPayment: {
    amount: 1000000,             // Amount of tokens (considering decimals)
    mint: "TokenMintAddress...", // Token mint address
    destinationAta: "DestinationATA..." // Destination Associated Token Account
  }
}
```

### Token2022 Payment
Requires users to pay with Token2022 tokens.

```javascript
{
  token2022Payment: {
    amount: 1000000,             // Amount of tokens
    mint: "TokenMintAddress...", // Token mint address
    destinationAta: "DestinationATA..." // Destination Associated Token Account
  }
}
```

### NFT Payment
Requires users to send an NFT from a specific collection as payment.

```javascript
{
  nftPayment: {
    requiredCollection: "CollectionAddress..." // Collection address for payment NFT
  }
}
```

### Asset Payment
Requires users to send an asset from a specific collection as payment.

```javascript
{
  assetPayment: {
    requiredCollection: "CollectionAddress...", // Collection address for payment asset
    destination: "DestinationAddress..."        // Address to receive the asset
  }
}
```

### Asset Payment Multi
Requires users to send multiple assets from a specific collection as payment.

```javascript
{
  assetPaymentMulti: {
    requiredCollection: "CollectionAddress...", // Collection address for payment assets
    destination: "DestinationAddress...",       // Address to receive the assets
    num: 3                                      // Number of assets required
  }
}
```

## Freeze Payment Guards

### Freeze Sol Payment
Freezes SOL payment for a specified period.

```javascript
{
  freezeSolPayment: {
    lamports: 1000000000,        // Amount in lamports
    destination: "111111111111111111111111111111111", // Wallet address
    period: 2592000              // Freeze period in seconds (30 days max)
  }
}
```

### Freeze Token Payment
Freezes token payment for a specified period.

```javascript
{
  freezeTokenPayment: {
    amount: 1000000,             // Amount of tokens
    mint: "TokenMintAddress...", // Token mint address
    destinationAta: "DestinationATA...", // Destination Associated Token Account
    period: 2592000              // Freeze period in seconds (30 days max)
  }
}
```

## Access Control Guards

### Address Gate
Restricts minting to a specific wallet address.

```javascript
{
  addressGate: {
    address: "WalletAddress..."  // Specific wallet address allowed to mint
  }
}
```

### Allow List
Restricts minting to wallets in a merkle tree allowlist.

```javascript
{
  allowList: {
    merkleRoot: "MerkleRootHash..." // Merkle root of allowed addresses
  }
}
```

### NFT Gate
Requires users to hold an NFT from a specific collection.

```javascript
{
  nftGate: {
    requiredCollection: "CollectionAddress..." // Collection address for required NFT
  }
}
```

### Token Gate
Requires users to hold a specific amount of tokens.

```javascript
{
  tokenGate: {
    mint: "TokenMintAddress...", // Token mint address
    amount: 1000000              // Required token amount
  }
}
```

### Asset Gate
Requires users to hold an asset from a specific collection.

```javascript
{
  assetGate: {
    requiredCollection: "CollectionAddress..." // Collection address for required asset
  }
}
```

### Program Gate
Requires specific programs to be present in the transaction.

```javascript
{
  programGate: {
    additional: ["Program1Address...", "Program2Address..."] // Array of program addresses
  }
}
```

### Third Party Signer
Requires an additional signer for the mint transaction.

```javascript
{
  thirdPartySigner: {
    signerKey: "SignerPublicKey..." // Public key of required signer
  }
}
```

## Time-Based Guards

### Start Date
Sets when minting can begin.

```javascript
{
  startDate: {
    date: 1700000000             // Unix timestamp for start date
  }
}
```

### End Date
Sets when minting must end.

```javascript
{
  endDate: {
    date: 1735689600             // Unix timestamp for end date
  }
}
```

## Limit Guards

### Mint Limit
Limits the number of mints per wallet.

```javascript
{
  mintLimit: {
    id: 1,                       // Unique identifier for this limit
    limit: 1                     // Maximum mints per wallet for this ID
  }
}
```

### Allocation
Allocates a specific number of mints to a wallet.

```javascript
{
  allocation: {
    id: 1,                       // Unique identifier for this allocation
    limit: 5                     // Number of mints allocated to the wallet
  }
}
```

### NFT Mint Limit
Limits mints based on NFT holdings from a specific collection.

```javascript
{
  nftMintLimit: {
    id: 1,                       // Unique identifier for this limit
    limit: 3,                    // Maximum mints per wallet
    requiredCollection: "CollectionAddress..." // Collection address for counting NFTs
  }
}
```

### Asset Mint Limit
Limits mints based on asset holdings from a specific collection.

```javascript
{
  assetMintLimit: {
    id: 1,                       // Unique identifier for this limit
    limit: 3,                    // Maximum mints per wallet
    requiredCollection: "CollectionAddress..." // Collection address for counting assets
  }
}
```

### Redeemed Amount
Limits the total number of mints for the entire candy machine.

```javascript
{
  redeemedAmount: {
    maximum: 1000                // Maximum total mints for the candy machine
  }
}
```

## Burn Guards

### NFT Burn
Requires users to burn an NFT from a specific collection.

```javascript
{
  nftBurn: {
    requiredCollection: "CollectionAddress..." // Collection address for NFT to burn
  }
}
```

### Token Burn
Requires users to burn a specific amount of tokens.

```javascript
{
  tokenBurn: {
    mint: "TokenMintAddress...", // Token mint address to burn
    amount: 1000000              // Amount of tokens to burn
  }
}
```

### Asset Burn
Requires users to burn an asset from a specific collection.

```javascript
{
  assetBurn: {
    requiredCollection: "CollectionAddress..." // Collection address for asset to burn
  }
}
```

### Asset Burn Multi
Requires users to burn multiple assets from a specific collection.

```javascript
{
  assetBurnMulti: {
    requiredCollection: "CollectionAddress...", // Collection address for assets to burn
    num: 3                                      // Number of assets to burn
  }
}
```

## Special Guards

### Bot Tax
Charges a penalty for bot-like behavior.

```javascript
{
  botTax: {
    lamports: 1000000,           // Penalty amount in lamports
    lastInstruction: true        // Whether to check if minting is the last instruction
  }
}
```

### Edition
Controls edition numbering for the minted NFTs.

```javascript
{
  edition: {
    editionStartOffset: 1        // Starting number for editions
  }
}
```

### Vanity Mint
Requires the mint address to match a specific regex pattern.

```javascript
{
  vanityMint: {
    regex: "^[0-9]{4}$"          // Regex pattern for mint address
  }
}
```

## Guard Groups

You can create multiple guard groups for different minting phases:

```javascript
{
  "groups": [
    {
      "label": "whitelist",
      "guards": {
        "allowList": {
          "merkleRoot": "MerkleRootHash..."
        },
        "solPayment": {
          "lamports": 500000000,
          "destination": "111111111111111111111111111111111"
        }
      }
    },
    {
      "label": "public",
      "guards": {
        "solPayment": {
          "lamports": 1000000000,
          "destination": "111111111111111111111111111111111"
        },
        "mintLimit": {
          "id": 1,
          "limit": 1
        }
      }
    }
  ]
}
```

## Common Guard Combinations

### Basic Public Mint
```javascript
{
  guardConfig: {
    solPayment: {
      lamports: 1000000000,
      destination: "111111111111111111111111111111111"
    },
    mintLimit: {
      id: 1,
      limit: 1
    }
  }
}
```

### Whitelist with Discount
```javascript
{
  guardConfig: {
    allowList: {
      merkleRoot: "MerkleRootHash..."
    },
    solPayment: {
      lamports: 500000000,
      destination: "111111111111111111111111111111111"
    },
    mintLimit: {
      id: 1,
      limit: 1
    }
  }
}
```

### NFT Holder Exclusive
```javascript
{
  guardConfig: {
    nftGate: {
      requiredCollection: "CollectionAddress..."
    },
    solPayment: {
      lamports: 750000000,
      destination: "111111111111111111111111111111111"
    },
    mintLimit: {
      id: 1,
      limit: 2
    }
  }
}
```

### Time-Limited Sale
```javascript
{
  guardConfig: {
    startDate: {
      date: 1700000000
    },
    endDate: {
      date: 1735689600
    },
    solPayment: {
      lamports: 1000000000,
      destination: "111111111111111111111111111111111"
    },
    mintLimit: {
      id: 1,
      limit: 1
    }
  }
}
```

## Best Practices

1. **Test Guards**: Always test guard configurations on devnet before mainnet
2. **Clear Documentation**: Document your guard strategy for users
3. **Reasonable Limits**: Set reasonable mint limits to prevent abuse
4. **Backup Plans**: Consider having fallback guard groups for different scenarios
5. **Monitor Usage**: Track how guards affect minting behavior
6. **User Experience**: Ensure guards don't create unnecessary friction for legitimate users

## Guard Validation

The CLI validates guard configurations before creating candy machines. Common validation errors:

- Invalid public key addresses
- Negative amounts or limits
- Missing required fields
- Invalid date formats
- Conflicting guard combinations

## Additional Resources

- [Metaplex Guard Documentation](https://docs.metaplex.com/programs/candy-machine/guards)
- [Guard Examples](https://github.com/metaplex-foundation/mpl-core-candy-machine)
- [Community Guard Patterns](https://discord.gg/metaplex)
