#!/usr/bin/env bash
# Genesis CLI Manual Test Script
# Tests the full lifecycle with optional flags using a local validator with devnet genesis.so
#
# Prerequisites:
#   1. Local validator running: npm run validator
#   2. CLI built: pnpm run build
#   3. RPC set to localhost: ./bin/dev.js config set rpcUrl http://localhost:8899
#
# Usage:
#   bash test/commands/genesis/genesis-manual-test.sh

set -euo pipefail

CLI="./bin/dev.js"
WALLET="Tes1zkZkXhgTaMFqVgbgvMsVkRJpq4Y6g54SbDBeKVV"
NOW=$(date +%s)
DEPOSIT_START=$((NOW - 3600))
DEPOSIT_END=$((NOW + 86400))
CLAIM_START=$((DEPOSIT_END + 1))
CLAIM_END=$((NOW + 86400 * 365))

pass() { echo "  PASS: $1"; }
fail() { echo "  FAIL: $1"; exit 1; }

extract_address() {
  echo "$1" | grep -E -o "$2: [A-Za-z0-9]+" | sed "s/^$2: //" | head -1
}

echo "=== Genesis CLI Manual Test ==="
echo ""

# --- Setup ---
echo "[Setup] Airdropping SOL..."
$CLI toolbox sol airdrop 100 "$WALLET" 2>&1 | grep -q "Airdropped" && pass "Airdrop" || fail "Airdrop"
sleep 2

echo "[Setup] Wrapping SOL..."
$CLI toolbox sol wrap 50 2>&1 | grep -q "Wrapped" && pass "Wrap SOL" || fail "Wrap SOL"

echo ""
echo "=== Test 1: Launch Pool with Optional Flags ==="
echo ""

# Step 1: Create genesis
echo "[1] Creating genesis account..."
CREATE_OUT=$($CLI genesis create --name "TestToken" --symbol "TST" --totalSupply 1000000000000000 --decimals 9 2>&1)
GENESIS=$(extract_address "$CREATE_OUT" "Genesis Account")
echo "    Genesis: $GENESIS"
[ -n "$GENESIS" ] && pass "Create genesis" || fail "Create genesis"

# Step 2: Add unlocked bucket (end behavior destination)
echo "[2] Adding unlocked bucket (index 0)..."
UNLOCKED_OUT=$($CLI genesis bucket add-unlocked "$GENESIS" \
  --recipient "$WALLET" \
  --claimStart "$CLAIM_START" \
  --allocation 0 \
  --bucketIndex 0 2>&1)
UNLOCKED_ADDR=$(extract_address "$UNLOCKED_OUT" "Bucket Address")
echo "    Unlocked bucket: $UNLOCKED_ADDR"
[ -n "$UNLOCKED_ADDR" ] && pass "Add unlocked bucket" || fail "Add unlocked bucket"

# Step 3: Add launch pool with all optional flags
echo "[3] Adding launch pool with optional flags (index 0)..."
LP_OUT=$($CLI genesis bucket add-launch-pool "$GENESIS" \
  --allocation 1000000000000000 \
  --depositStart "$DEPOSIT_START" \
  --depositEnd "$DEPOSIT_END" \
  --claimStart "$CLAIM_START" \
  --claimEnd "$CLAIM_END" \
  --bucketIndex 0 \
  --endBehavior "$UNLOCKED_ADDR:10000" \
  --minimumDeposit 100000000 \
  --depositLimit 10000000000 \
  --minimumQuoteTokenThreshold 500000000 \
  --depositPenalty '{"slopeBps":0,"interceptBps":0,"maxBps":0,"startTime":0,"endTime":0}' \
  --withdrawPenalty '{"slopeBps":0,"interceptBps":0,"maxBps":0,"startTime":0,"endTime":0}' \
  --bonusSchedule '{"slopeBps":0,"interceptBps":0,"maxBps":0,"startTime":0,"endTime":0}' \
  2>&1)
echo "$LP_OUT" | grep -q "Launch pool bucket added" && pass "Add launch pool with flags" || fail "Add launch pool with flags"

# Step 4: Finalize
echo "[4] Finalizing genesis..."
$CLI genesis finalize "$GENESIS" 2>&1 | grep -q "finalized successfully" && pass "Finalize" || fail "Finalize"

# Step 5: Test minimumDeposit enforcement
echo "[5] Depositing below minimum (should fail)..."
if $CLI genesis deposit "$GENESIS" --amount 50000000 --bucketIndex 0 2>&1 | grep -q "below the minimum"; then
  pass "Minimum deposit enforced"
else
  fail "Minimum deposit NOT enforced"
fi

# Step 6: Test depositLimit enforcement
echo "[6] Depositing above limit (should fail)..."
if $CLI genesis deposit "$GENESIS" --amount 10000000001 --bucketIndex 0 2>&1 | grep -q "exceeds the deposit limit"; then
  pass "Deposit limit enforced"
else
  fail "Deposit limit NOT enforced"
fi

# Step 7: Valid deposit
echo "[7] Depositing 1 SOL (within bounds)..."
$CLI genesis deposit "$GENESIS" --amount 1000000000 --bucketIndex 0 2>&1 | grep -q "Deposit successful" && pass "Deposit 1 SOL" || fail "Deposit 1 SOL"

# Step 8: Second deposit
echo "[8] Depositing 5 SOL (within bounds)..."
$CLI genesis deposit "$GENESIS" --amount 5000000000 --bucketIndex 0 2>&1 | grep -q "Deposit successful" && pass "Deposit 5 SOL" || fail "Deposit 5 SOL"

# Step 9: Withdraw
echo "[9] Withdrawing 1 SOL..."
$CLI genesis withdraw "$GENESIS" --amount 1000000000 --bucketIndex 0 2>&1 | grep -q "Withdrawal successful" && pass "Withdraw 1 SOL" || fail "Withdraw 1 SOL"

# Step 10: Verify bucket state
echo "[10] Fetching bucket state..."
BUCKET_OUT=$($CLI genesis bucket fetch "$GENESIS" --bucketIndex 0 2>&1)
echo "$BUCKET_OUT" | grep -q "Deposit Count: 1" && pass "Deposit count correct" || fail "Deposit count"
echo "$BUCKET_OUT" | grep -q "Claim Count: 0" && pass "Claim count correct" || fail "Claim count"

# Step 11: Revoke mint
echo "[11] Revoking mint authority..."
$CLI genesis revoke "$GENESIS" --revokeMint 2>&1 | grep -q "Authorities revoked" && pass "Revoke mint" || fail "Revoke mint"

echo ""
echo "=== Test 2: Presale Workflow ==="
echo ""

# Create a new genesis for presale test
echo "[12] Creating genesis for presale..."
CREATE2_OUT=$($CLI genesis create --name "PresaleTest" --symbol "PST" --totalSupply 1000000000000000 --decimals 9 2>&1)
GENESIS2=$(extract_address "$CREATE2_OUT" "Genesis Account")
echo "     Genesis: $GENESIS2"
[ -n "$GENESIS2" ] && pass "Create presale genesis" || fail "Create presale genesis"

# Add presale bucket
echo "[13] Adding presale bucket (index 0)..."
$CLI genesis bucket add-presale "$GENESIS2" \
  --allocation 1000000000000000 \
  --quoteCap 10000000000 \
  --depositStart "$DEPOSIT_START" \
  --depositEnd "$DEPOSIT_END" \
  --claimStart "$CLAIM_START" \
  --bucketIndex 0 \
  --minimumDeposit 100000000 \
  --depositLimit 5000000000 \
  2>&1 | grep -q "Presale bucket added" && pass "Add presale bucket" || fail "Add presale bucket"

# Fetch presale bucket
echo "[14] Fetching presale bucket..."
$CLI genesis bucket fetch "$GENESIS2" --bucketIndex 0 --type presale 2>&1 | grep -q "Presale Bucket" && pass "Fetch presale bucket" || fail "Fetch presale bucket"

# Finalize
echo "[15] Finalizing presale genesis..."
$CLI genesis finalize "$GENESIS2" 2>&1 | grep -q "finalized successfully" && pass "Finalize presale" || fail "Finalize presale"

# Deposit into presale
echo "[16] Depositing 2 SOL into presale..."
$CLI genesis presale deposit "$GENESIS2" --amount 2000000000 --bucketIndex 0 2>&1 | grep -q "Presale deposit successful" && pass "Presale deposit" || fail "Presale deposit"

# Fetch to verify deposit
echo "[17] Verifying presale bucket state..."
PRESALE_OUT=$($CLI genesis bucket fetch "$GENESIS2" --bucketIndex 0 --type presale 2>&1)
echo "$PRESALE_OUT" | grep -q "Deposit Count: 1" && pass "Presale deposit count" || fail "Presale deposit count"

echo ""
echo "=== Test 3: Unlocked Bucket Workflow ==="
echo ""

# Create genesis for unlocked test
echo "[18] Creating genesis for unlocked test..."
CREATE3_OUT=$($CLI genesis create --name "UnlockedTest" --symbol "UNL" --totalSupply 1000000000000000 --decimals 9 2>&1)
GENESIS3=$(extract_address "$CREATE3_OUT" "Genesis Account")
echo "     Genesis: $GENESIS3"
[ -n "$GENESIS3" ] && pass "Create unlocked genesis" || fail "Create unlocked genesis"

# Add unlocked bucket with allocation
echo "[19] Adding unlocked bucket with 1M token allocation..."
$CLI genesis bucket add-unlocked "$GENESIS3" \
  --recipient "$WALLET" \
  --claimStart "$CLAIM_START" \
  --allocation 1000000000000000 \
  --bucketIndex 0 \
  2>&1 | grep -q "Unlocked bucket added" && pass "Add unlocked with allocation" || fail "Add unlocked with allocation"

# Fetch unlocked bucket
echo "[20] Fetching unlocked bucket..."
UNLOCK_OUT=$($CLI genesis bucket fetch "$GENESIS3" --bucketIndex 0 --type unlocked 2>&1)
echo "$UNLOCK_OUT" | grep -q "Unlocked Bucket" && pass "Fetch unlocked bucket" || fail "Fetch unlocked bucket"
echo "$UNLOCK_OUT" | grep -q "Claimed: No" && pass "Not yet claimed" || fail "Not yet claimed"

echo ""
echo "=== All tests passed! ==="
