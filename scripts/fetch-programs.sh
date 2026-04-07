#!/usr/bin/env bash
# scripts/fetch-programs.sh
#
# Fetches the latest Solana program binaries from Devnet for local validator testing.
# Requires: solana CLI tools (solana program dump)
#
# Usage: ./scripts/fetch-programs.sh [--rpc <URL>]
#
# Programs that have GitHub release binaries are fetched from there.
# Programs that don't (genesis, token-metadata, agent, distro, noop, compression)
# are dumped from Devnet using `solana program dump`.

set -euo pipefail

AMMAN_DIR=".amman"
RPC_URL="${1:-https://api.devnet.solana.com}"

if [[ "$1" == "--rpc" ]] && [[ -n "${2:-}" ]]; then
  RPC_URL="$2"
fi

echo "Fetching program binaries..."
echo "RPC: $RPC_URL"
echo ""

# Programs available from GitHub releases
declare -A GITHUB_PROGRAMS=(
  ["mpl_core.so"]="https://github.com/metaplex-foundation/mpl-core/releases/download/release/core%400.10.0/mpl_core_program.so"
  ["mpl_bubblegum.so"]="https://github.com/metaplex-foundation/mpl-bubblegum/releases/download/release/bubblegum%401.0.0/bubblegum.so"
  ["mpl_core_candy_guard.so"]="https://github.com/metaplex-foundation/mpl-core-candy-machine/releases/download/release/candy-guard%400.2.2/mpl_core_candy_guard.so"
)

for file in "${!GITHUB_PROGRAMS[@]}"; do
  url="${GITHUB_PROGRAMS[$file]}"
  echo "Downloading $file from GitHub releases..."
  curl -sL -o "$AMMAN_DIR/$file" "$url"
  echo "  $(wc -c < "$AMMAN_DIR/$file") bytes"
done

# Programs that must be dumped from Devnet via solana CLI
declare -A DUMP_PROGRAMS=(
  ["mpl_token_metadata.so"]="metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
  ["mpl_core_candy_machine.so"]="CMACYFENjoBMHzapRXyo1JZkVS6EtaDDzkjMrmQLvr4J"
  ["mpl_distro.so"]="D1STRoZTUiEa6r8TLg2aAbG4nSRT5cDBmgG7jDqCZvU8"
  ["genesis.so"]="GNS1S5J5AspKXgpjz6SvKL66kPaKWAhaGRhCqPRxii2B"
  ["mpl_agent_identity.so"]="1DREGFgysWYxLnRnKQnwrxnJQeSMk2HmGaC6whw2B2p"
  ["mpl_agent_tools.so"]="TLREGni9ZEyGC3vnPZtqUh95xQ8oPqJSvNjvB7FGK8S"
  ["spl_noop.so"]="noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV"
  ["mpl_noop.so"]="mnoopTCrg4p8ry25e4bcWA9XZjbNjMTfgYVGGEdRsf3"
  ["mpl_account_compression.so"]="mcmt6YrQEMKw8Mw43FmpRLmf7BqRnFMKmAcbxE3xkAW"
  ["spl_account_compression.so"]="cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK"
)

if ! command -v solana &>/dev/null; then
  echo ""
  echo "WARNING: solana CLI not found. Skipping program dumps."
  echo "Install solana CLI and rerun to fetch remaining programs:"
  echo "  sh -c \"\$(curl -sSfL https://release.anza.xyz/stable/install)\""
  echo ""
  echo "Programs that need manual dump:"
  for file in "${!DUMP_PROGRAMS[@]}"; do
    echo "  solana program dump -u $RPC_URL ${DUMP_PROGRAMS[$file]} $AMMAN_DIR/$file"
  done
  exit 0
fi

for file in "${!DUMP_PROGRAMS[@]}"; do
  program_id="${DUMP_PROGRAMS[$file]}"
  echo "Dumping $file ($program_id) from Devnet..."
  solana program dump -u "$RPC_URL" "$program_id" "$AMMAN_DIR/$file"
  echo "  $(wc -c < "$AMMAN_DIR/$file") bytes"
done

echo ""
echo "All programs updated successfully!"
