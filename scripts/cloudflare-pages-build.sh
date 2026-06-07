#!/usr/bin/env bash
set -euo pipefail

export PATH="$HOME/.cargo/bin:$PATH"

if ! command -v rustup >/dev/null 2>&1; then
	curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal
	export PATH="$HOME/.cargo/bin:$PATH"
fi

rustup toolchain install nightly --component rust-src
rustup target add wasm32-unknown-unknown --toolchain nightly

if ! command -v wasm-bindgen >/dev/null 2>&1 || ! wasm-bindgen -V | grep -q '^wasm-bindgen 0.2.105'; then
	cargo install wasm-bindgen-cli --version 0.2.105 --locked
fi

export SKIP_WASM_SNIP=1
pnpm pages:build
