# Manual Test Commands (Devnet)

All commands use devnet RPC and the test keypair.

## Bucket Fetch (auto-detects type)

```bash
node bin/run.js genesis bucket fetch 4UA9gdzd5XwaFMJ5rm9QhTECKHySMidEBDTbhHW9svZ5 -r https://api.devnet.solana.com -k test-files/key.json
```

## Bucket Fetch (explicit type)

```bash
node bin/run.js genesis bucket fetch 4UA9gdzd5XwaFMJ5rm9QhTECKHySMidEBDTbhHW9svZ5 --type bonding-curve -r https://api.devnet.solana.com -k test-files/key.json
```

## Swap Info — status only (price, reserves, fill %, swappable)

```bash
node bin/run.js genesis swap 4UA9gdzd5XwaFMJ5rm9QhTECKHySMidEBDTbhHW9svZ5 --info -r https://api.devnet.solana.com -k test-files/key.json
```

## Swap Info — with buy quote (adds: tokens out, fees, min out for 0.1 SOL)

```bash
node bin/run.js genesis swap 4UA9gdzd5XwaFMJ5rm9QhTECKHySMidEBDTbhHW9svZ5 --info --buyAmount 100000000 -r https://api.devnet.solana.com -k test-files/key.json
```

## Swap Info — with sell quote (adds: SOL out, fees, min out for selling tokens)

```bash
node bin/run.js genesis swap 4UA9gdzd5XwaFMJ5rm9QhTECKHySMidEBDTbhHW9svZ5 --info --sellAmount 1000000000 -r https://api.devnet.solana.com -k test-files/key.json
```

## Swap Buy (0.05 SOL, auto-wraps if needed)

```bash
node bin/run.js genesis swap 4UA9gdzd5XwaFMJ5rm9QhTECKHySMidEBDTbhHW9svZ5 --buyAmount 50000000 -r https://api.devnet.solana.com -k test-files/key.json
```

## Swap Buy with 1% slippage

```bash
node bin/run.js genesis swap 4UA9gdzd5XwaFMJ5rm9QhTECKHySMidEBDTbhHW9svZ5 --buyAmount 50000000 --slippage 100 -r https://api.devnet.solana.com -k test-files/key.json
```

## Swap Sell

```bash
node bin/run.js genesis swap 4UA9gdzd5XwaFMJ5rm9QhTECKHySMidEBDTbhHW9svZ5 --sellAmount 500000000000 -r https://api.devnet.solana.com -k test-files/key.json
```

## Launch Create with registration flags

```bash
node bin/run.js genesis launch create --launchType bonding-curve --name "Flag Test" --symbol "FLG" --image "https://gateway.irys.xyz/abc123" --creatorWallet TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx --twitterVerificationToken "test-token" -r https://api.devnet.solana.com -k test-files/key.json
```

## Launch Register with registration flags

```bash
echo '{"wallet":"TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx","token":{"name":"Test","symbol":"TST","image":"https://gateway.irys.xyz/abc"},"launchType":"bondingCurve","launch":{}}' > /tmp/test-launch-config.json && node bin/run.js genesis launch register REPLACE_WITH_GENESIS_ACCOUNT --launchConfig /tmp/test-launch-config.json --creatorWallet TESTfCYwTPxME2cAnPcKvvF5xdPah3PY7naYQEP2kkx --twitterVerificationToken "test-token" -r https://api.devnet.solana.com -k test-files/key.json
```

## Validation Errors

```bash
node bin/run.js genesis launch create --launchType bonding-curve --name "Test" --symbol "TST" --image "https://gateway.irys.xyz/abc123" --creatorWallet "not-a-key" -r https://api.devnet.solana.com -k test-files/key.json
```

```bash
node bin/run.js genesis swap 4UA9gdzd5XwaFMJ5rm9QhTECKHySMidEBDTbhHW9svZ5 -r https://api.devnet.solana.com -k test-files/key.json
```

```bash
node bin/run.js genesis swap 4UA9gdzd5XwaFMJ5rm9QhTECKHySMidEBDTbhHW9svZ5 --buyAmount 100 --sellAmount 100 -r https://api.devnet.solana.com -k test-files/key.json
```
