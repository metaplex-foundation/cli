# Candy Machine Guard Groups

Guard groups allow you to create different minting phases with distinct rules and restrictions for your candy machine. Each group can have its own set of guards, enabling complex minting strategies like whitelist phases, public sales, and exclusive drops.

## What Are Guard Groups?

Guard groups are collections of guards that apply to specific minting phases. Instead of having a single set of rules for your entire candy machine, you can create multiple groups with different requirements and pricing.

**Key Benefits:**
- **Phased Minting**: Create different phases (whitelist, public, etc.)
- **Flexible Pricing**: Different prices for different phases
- **Access Control**: Different access requirements per phase
- **Time Management**: Control when each phase is active
- **User Experience**: Provide fair access to different user types

## Group Structure

Each guard group has two main properties:

```javascript
{
  label: "group",                // Unique identifier (max 6 characters)
  guards: {                      // Guards that apply to this group
    // Guard configurations here
  }
}
```

**Important:** Group labels are limited to **6 characters maximum**.

## Configuration Layout

Guard groups are configured in the `groups` array of your candy machine configuration:

```javascript
{
  "name": "My Candy Machine",
  "config": {
    "collection": "CollectionAddress...",
    "itemsAvailable": 1000,
    "isMutable": true,
    "isSequential": false,
    "guardConfig": {
      // Global guards (apply to all groups)
    },
    "groups": [
      {
        "label": "wl",           // Whitelist (2 chars)
        "guards": {
          // Guards for whitelist phase
        }
      },
      {
        "label": "public",       // Public (6 chars)
        "guards": {
          // Guards for public phase
        }
      }
    ]
  }
}
```

## Group vs Global Guards

### Global Guards (`guardConfig`)
- Apply to **all groups** and the candy machine as a whole
- Cannot be overridden by group guards
- Useful for universal restrictions like bot protection

### Group Guards (`groups[].guards`)
- Apply only to the specific group
- Can override some global guard settings
- Allow different rules per minting phase

## Common Group Strategies

### 1. Whitelist → Public Sale

```javascript
{
  "groups": [
    {
      "label": "wl",             // Whitelist (2 chars)
      "guards": {
        "allowList": {
          "merkleRoot": "MerkleRootHash..."
        },
        "solPayment": {
          "lamports": 500000000,  // 0.5 SOL
          "destination": "111111111111111111111111111111111"
        },
        "mintLimit": {
          "id": 1,
          "limit": 1
        },
        "startDate": {
          "date": 1700000000
        },
        "endDate": {
          "date": 1700086400  // 24 hours later
        }
      }
    },
    {
      "label": "public",         // Public (6 chars)
      "guards": {
        "solPayment": {
          "lamports": 1000000000,  // 1 SOL
          "destination": "111111111111111111111111111111111"
        },
        "mintLimit": {
          "id": 2,
          "limit": 2
        },
        "startDate": {
          "date": 1700086400
        }
      }
    }
  ]
}
```

### 2. NFT Holder → Public Sale

```javascript
{
  "groups": [
    {
      "label": "nft",            // NFT holders (3 chars)
      "guards": {
        "nftGate": {
          "requiredCollection": "PreviousCollectionAddress..."
        },
        "solPayment": {
          "lamports": 750000000,  // 0.75 SOL
          "destination": "111111111111111111111111111111111"
        },
        "mintLimit": {
          "id": 1,
          "limit": 2
        }
      }
    },
    {
      "label": "public",         // Public (6 chars)
      "guards": {
        "solPayment": {
          "lamports": 1000000000,  // 1 SOL
          "destination": "111111111111111111111111111111111"
        },
        "mintLimit": {
          "id": 2,
          "limit": 1
        }
      }
    }
  ]
}
```

### 3. Token Holder → Public Sale

```javascript
{
  "groups": [
    {
      "label": "token",          // Token holders (5 chars)
      "guards": {
        "tokenGate": {
          "mint": "TokenMintAddress...",
          "amount": 1000000  // 1 token (with decimals)
        },
        "solPayment": {
          "lamports": 600000000,  // 0.6 SOL
          "destination": "111111111111111111111111111111111"
        },
        "mintLimit": {
          "id": 1,
          "limit": 3
        }
      }
    },
    {
      "label": "public",         // Public (6 chars)
      "guards": {
        "solPayment": {
          "lamports": 1000000000,  // 1 SOL
          "destination": "111111111111111111111111111111111"
        },
        "mintLimit": {
          "id": 2,
          "limit": 1
        }
      }
    }
  ]
}
```

### 4. Time-Based Phases

```javascript
{
  "groups": [
    {
      "label": "early",          // Early bird (5 chars)
      "guards": {
        "solPayment": {
          "lamports": 800000000,  // 0.8 SOL
          "destination": "111111111111111111111111111111111"
        },
        "mintLimit": {
          "id": 1,
          "limit": 1
        },
        "startDate": {
          "date": 1700000000
        },
        "endDate": {
          "date": 1700086400  // 24 hours
        }
      }
    },
    {
      "label": "reg",            // Regular (3 chars)
      "guards": {
        "solPayment": {
          "lamports": 1000000000,  // 1 SOL
          "destination": "111111111111111111111111111111111"
        },
        "mintLimit": {
          "id": 2,
          "limit": 1
        },
        "startDate": {
          "date": 1700086400
        },
        "endDate": {
          "date": 1700172800  // Next 24 hours
        }
      }
    },
    {
      "label": "final",          // Final (5 chars)
      "guards": {
        "solPayment": {
          "lamports": 1200000000,  // 1.2 SOL
          "destination": "111111111111111111111111111111111"
        },
        "mintLimit": {
          "id": 3,
          "limit": 2
        },
        "startDate": {
          "date": 1700172800
        }
      }
    }
  ]
}
```

## Advanced Group Configurations

### Multiple Payment Types

```javascript
{
  "groups": [
    {
      "label": "sol",            // SOL only (3 chars)
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
    },
    {
      "label": "token",          // Token payment (5 chars)
      "guards": {
        "tokenPayment": {
          "amount": 1000000,
          "mint": "TokenMintAddress...",
          "destinationAta": "DestinationATA..."
        },
        "mintLimit": {
          "id": 2,
          "limit": 1
        }
      }
    }
  ]
}
```

### Burn Requirements

```javascript
{
  "groups": [
    {
      "label": "burn",           // Burn to mint (4 chars)
      "guards": {
        "nftBurn: {
          "requiredCollection": "OldCollectionAddress..."
        },
        "solPayment": {
          "lamports": 500000000,  // Reduced price for burning
          "destination": "111111111111111111111111111111111"
        },
        "mintLimit": {
          "id": 1,
          "limit": 1
        }
      }
    },
    {
      "label": "reg",            // Regular mint (3 chars)
      "guards": {
        "solPayment": {
          "lamports": 1000000000,
          "destination": "111111111111111111111111111111111"
        },
        "mintLimit": {
          "id": 2,
          "limit": 1
        }
      }
    }
  ]
}
```

### Complex Access Control

```javascript
{
  "groups": [
    {
      "label": "vip",            // VIP (3 chars)
      "guards": {
        "allowList": {
          "merkleRoot": "VIPMerkleRoot..."
        },
        "nftGate": {
          "requiredCollection": "VIPCollection..."
        },
        "solPayment": {
          "lamports": 500000000,
          "destination": "111111111111111111111111111111111"
        },
        "mintLimit": {
          "id": 1,
          "limit": 3
        }
      }
    },
    {
      "label": "wl",             // Whitelist (2 chars)
      "guards": {
        "allowList": {
          "merkleRoot": "WhitelistMerkleRoot..."
        },
        "solPayment": {
          "lamports": 750000000,
          "destination": "111111111111111111111111111111111"
        },
        "mintLimit": {
          "id": 2,
          "limit": 1
        }
      }
    },
    {
      "label": "public",         // Public (6 chars)
      "guards": {
        "solPayment": {
          "lamports": 1000000000,
          "destination": "111111111111111111111111111111111"
        },
        "mintLimit": {
          "id": 3,
          "limit": 1
        }
      }
    }
  ]
}
```

## Group Management Best Practices

### 1. Clear Naming (6 Character Limit)
Use descriptive but concise group labels:
- `wl` (whitelist), `public`, `vip`
- `early`, `reg` (regular), `final`
- `nft`, `token`, `burn`

**Common Abbreviations:**
- `wl` = whitelist
- `reg` = regular
- `nft` = NFT holders
- `token` = token holders
- `burn` = burn to mint
- `vip` = VIP access
- `early` = early bird
- `final` = final phase

### 2. Logical Progression
Design groups to flow naturally:
- Start with most exclusive (VIP/whitelist)
- Progress to broader access
- End with public sale

### 3. Fair Pricing
Consider pricing tiers that reward early supporters:
- VIP/whitelist: Lower price
- Public: Standard price
- Final phase: Higher price (if supply is limited)

### 4. Time Management
Use `startDate` and `endDate` guards to control phase timing:
- Ensure phases don't overlap
- Give enough time for each phase
- Plan for potential delays

### 5. Limit Management
Use different `mintLimit` IDs for each group:
- Prevents conflicts between groups
- Allows different limits per phase
- Enables complex minting strategies

## Group Configuration Examples

### Complete Configuration with Groups

```javascript
{
  "name": "My NFT Collection",
  "config": {
    "collection": "CollectionAddress...",
    "itemsAvailable": 1000,
    "isMutable": true,
    "isSequential": false,
    "guardConfig": {
      "botTax": {
        "lamports": 1000000,
        "lastInstruction": true
      }
    },
    "groups": [
      {
        "label": "wl",           // Whitelist (2 chars)
        "guards": {
          "allowList": {
            "merkleRoot": "WhitelistMerkleRoot..."
          },
          "solPayment": {
            "lamports": 500000000,
            "destination": "111111111111111111111111111111111"
          },
          "mintLimit": {
            "id": 1,
            "limit": 1
          },
          "startDate": {
            "date": 1700000000
          },
          "endDate": {
            "date": 1700086400
          }
        }
      },
      {
        "label": "public",       // Public (6 chars)
        "guards": {
          "solPayment": {
            "lamports": 1000000000,
            "destination": "111111111111111111111111111111111"
          },
          "mintLimit": {
            "id": 2,
            "limit": 2
          },
          "startDate": {
            "date": 1700086400
          }
        }
      }
    ]
  }
}
```

## Testing Groups

### Devnet Testing
Always test your group configuration on devnet:
1. Create candy machine with groups
2. Test each group's guards
3. Verify timing and limits work correctly
4. Test group transitions

### Common Issues
- **Overlapping dates**: Ensure phases don't conflict
- **Limit conflicts**: Use different IDs for mint limits
- **Access conflicts**: Verify group access requirements
- **Payment issues**: Test all payment methods
- **Label length**: Ensure all group labels are ≤ 6 characters

## Group Monitoring

### Track Group Usage
Monitor how each group performs:
- Mint counts per group
- Revenue per phase
- User engagement
- Success rates

### Adjust Strategy
Use data to improve future launches:
- Adjust pricing tiers
- Modify time allocations
- Refine access requirements
- Optimize group structure

## Additional Resources

- [Guard Documentation](./guards.md)
- [Candy Machine Configuration](./candyMachine.md)
- [Metaplex Documentation](https://developers.metaplex.com)
