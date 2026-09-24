#!/bin/sh
set -eu
cd "$(dirname "$0")"
# Requires Rust with wasm32-unknown-unknown and wasm-bindgen-cli 0.2.104.
export RUSTFLAGS="${RUSTFLAGS:-} --cfg getrandom_backend=\"wasm_js\""
cargo build --locked --release --target wasm32-unknown-unknown
wasm-bindgen target/wasm32-unknown-unknown/release/elevator_dwg.wasm \
  --target web --out-dir ../../dist/cad-assets/dwg
